import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Store conversations in memory (can be moved to DB later)
const conversationStore = new Map();

// Generate unique conversation ID
export function generateConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Clarification prompts based on initial information
const CLARIFICATION_PROMPTS = {
  interests: `Based on the initial travel request, ask 2-3 clarifying questions about:
- Specific interests (museums, nature, food, adventure, nightlife, culture, shopping, etc.)
- Travel pace (relaxed, moderate, packed with activities)
- Budget preferences for activities

Format your response as JSON:
{
  "message": "Your friendly greeting and questions",
  "questions": ["question1", "question2", "question3"]
}`,

  accommodation: `Ask about accommodation preferences:
- Budget range for hotels
- Type of accommodation (luxury hotel, boutique, hostel, Airbnb, etc.)
- Location preference (city center, beach, quiet area)

Format your response as JSON:
{
  "message": "Your questions",
  "questions": ["question1", "question2"]
}`,

  dining: `Ask about dining preferences:
- Favorite cuisines
- Budget for meals
- Dietary restrictions
- Local food experience level

Format your response as JSON:
{
  "message": "Your questions",
  "questions": ["question1", "question2"]
}`,

  activities: `Ask about activity preferences:
- Physical activity level
- Indoor vs outdoor preferences
- Group vs solo activities
- Special interests (art, history, sports, etc.)

Format your response as JSON:
{
  "message": "Your questions",
  "questions": ["question1", "question2"]
}`,
};

// Initialize conversation and ask first questions
export async function initializeConversation(initialRequest) {
  const convId = generateConversationId();

  const systemPrompt = `You are a friendly and knowledgeable travel planning assistant. 
Your goal is to gather detailed information about the traveler's preferences to create a highly personalized itinerary.
Be warm, engaging, and ask follow-up questions based on their responses.
Remember all previous information they've shared.
Respond in a conversational, friendly tone.`;

  const messages = [
    {
      role: "user",
      content: `
		<travel_request>
		<destination>
			<city>${initialRequest.city}</city>
			<country>${initialRequest.country}</country>
		</destination>
		<trip_details>
			<duration_days>${initialRequest.days}</duration_days>
			<total_budget_usd>${initialRequest.budget}</total_budget_usd>
		</trip_details>
		</travel_request>

		I want to plan a trip based on the information above. Please ask me clarifying questions about my preferences to create a personalized itinerary.
    `,
    },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages,
    });

    const assistantMessage = response.content[0].text;

    // Store conversation
    conversationStore.set(convId, {
      initialRequest,
      messages: [
        messages[0],
        {
          role: "assistant",
          content: assistantMessage,
        },
      ],
      systemPrompt,
      metadata: {
        createdAt: new Date(),
        stage: "gathering_preferences",
      },
    });

    return {
      conversationId: convId,
      assistantMessage,
      stage: "clarification",
    };
  } catch (error) {
    console.error("Error initializing conversation:", error);
    throw error;
  }
}

// Continue conversation - send user response and get next question/response
export async function continueConversation(conversationId, userMessage) {
  const conversation = conversationStore.get(conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const { initialRequest } = conversation;

  // Улучшенный system prompt с XML структурой
  const enhancedSystemPrompt = `You are a friendly and knowledgeable travel planning assistant.

<your_role>
- Gather detailed information about traveler preferences
- Ask clarifying questions based on their responses
- Remember all previously shared information
- Be warm, engaging, and conversational
- Provide thoughtful recommendations
</your_role>

<key_information>
  <trip_context>
    <destination_city>${initialRequest.city}</destination_city>
    <destination_country>${initialRequest.country}</destination_country>
    <duration_days>${initialRequest.days}</duration_days>
    <total_budget>${initialRequest.budget}</total_budget>
  </trip_context>
  <conversation_stage>gathering_preferences</conversation_stage>
  <goal>Understand traveler's interests, travel style, accommodation preferences, dining preferences, and activity level</goal>
</key_information>

<questioning_strategy>
- Ask 2-3 questions at a time (not overwhelming)
- Reference their previous answers in follow-ups
- Ask about: interests, travel pace, accommodation type, dining preferences, activity level, special requirements
- Gradually build a complete picture of their preferences
</questioning_strategy>

<response_guidelines>
- Be conversational and friendly
- Use emojis occasionally for warmth
- Ask specific, actionable questions
- Show you're listening by referencing their answers
- After gathering sufficient information, let them know you're ready to create their plan
</response_guidelines>`;

  // Add user message
  conversation.messages.push({
    role: "user",
    content: userMessage,
  });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      system: enhancedSystemPrompt,
      messages: conversation.messages,
    });

    const assistantMessage = response.content[0].text;

    // Add assistant response
    conversation.messages.push({
      role: "assistant",
      content: assistantMessage,
    });

    // Update conversation
    conversationStore.set(conversationId, conversation);

    // Determine if ready for plan
    const isReadyForPlan =
      conversation.messages.length >= 8 ||
      userMessage.toLowerCase().includes("done") ||
      userMessage.toLowerCase().includes("proceed") ||
      userMessage.toLowerCase().includes("ready") ||
      userMessage.toLowerCase().includes("generate");

    return {
      conversationId,
      assistantMessage,
      isReadyForPlan,
      messageCount: conversation.messages.length,
    };
  } catch (error) {
    console.error("Error continuing conversation:", error);
    throw error;
  }
}

// Generate final plan based on entire conversation
export async function generateFinalPlan(conversationId) {
  const conversation = conversationStore.get(conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const { initialRequest, messages } = conversation;

  const conversationHistory = messages
    .map(
      (msg) =>
        `${msg.role === "user" ? "Traveler" : "Assistant"}: ${msg.content}`,
    )
    .join("\n\n");

  const finalPrompt = `
<task>
Create a highly personalized and detailed travel itinerary based on the conversation history below.
</task>

<trip_requirements>
  <destination>
    <city>${initialRequest.city}</city>
    <country>${initialRequest.country}</country>
  </destination>
  <budget>
    <total_usd>${initialRequest.budget}</total_usd>
    <currency>USD</currency>
  </budget>
  <duration>
    <days>${initialRequest.days}</days>
  </duration>
</trip_requirements>

<conversation_history>
${conversationHistory}
</conversation_history>

<requirements>
- Create a ${initialRequest.days}-day itinerary that reflects ALL preferences mentioned in the conversation
- Include specific times for activities (HH:MM format)
- Estimate realistic costs for each activity
- Ensure total cost matches approximately the budget provided
- For each activity location, use SPECIFIC place names (not just "park" but "Central Park" or neighborhood)
- Include restaurant recommendations that match their dining preferences
- Add local tips, packing tips, and safety tips relevant to their interests
</requirements>

<output_format>
Return ONLY valid JSON (no markdown, no extra text). Use this exact structure:

{
  "title": "string - catchy, personalized title reflecting their travel style",
  "overview": "string - 2-3 sentence summary of the itinerary",
  "destination": {
    "city": "${initialRequest.city}",
    "country": "${initialRequest.country}"
  },
  "personalizationNote": "string - explain why this plan specifically matches their stated preferences",
  "dailyItinerary": [
    {
      "day": number,
      "theme": "string - theme for this day based on activities",
      "activities": [
        {
          "time": "string (HH:MM format)",
          "activity": "string - activity name",
          "location": "string - SPECIFIC location name (neighborhood, landmark, street)",
          "estimatedCost": number,
          "description": "string - detailed description",
          "whyIncluded": "string - explain why based on their preferences"
        }
      ],
      "restaurants": [
        {
          "name": "string",
          "cuisine": "string",
          "estimatedCost": number,
          "whyRecommended": "string - explain why based on their dining preferences"
        }
      ],
      "dayBudget": number
    }
  ],
  "totalEstimatedCost": number,
  "packingTips": ["string - relevant to activities and climate"],
  "localTips": ["string - insider tips relevant to their interests"],
  "safetyTips": ["string - safety advice for their planned activities"],
  "bestTimeToVisit": "string - advice on best time to visit during their trip dates",
  "gettingAround": "string - transportation recommendations based on their preferences"
}
</output_format>
`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      system: `<assistant_role>
You are an expert travel planner with 20+ years of experience creating personalized itineraries.
Your strength is understanding traveler preferences and creating detailed, realistic plans.
Always prioritize traveler preferences over generic recommendations.
When recommending locations, always use SPECIFIC place names that can be found on maps.
</assistant_role>`,
      messages: [
        ...messages,
        {
          role: "user",
          content: finalPrompt,
        },
      ],
    });

    const responseText = response.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response");
    }

    const plan = JSON.parse(jsonMatch[0]);

    conversation.metadata.stage = "completed";
    conversation.metadata.completedAt = new Date();
    conversationStore.set(conversationId, conversation);

    return plan;
  } catch (error) {
    console.error("Error generating final plan:", error);
    throw error;
  }
}

// Get conversation history
export function getConversationHistory(conversationId) {
  const conversation = conversationStore.get(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  return conversation.messages;
}

// Delete conversation (for cleanup)
export function deleteConversation(conversationId) {
  conversationStore.delete(conversationId);
}
