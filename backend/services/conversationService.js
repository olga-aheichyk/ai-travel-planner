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
      content: `I want to plan a trip to ${initialRequest.city}, ${initialRequest.country} for ${initialRequest.days} days with a budget of $${initialRequest.budget}.`,
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

  // Add user message
  conversation.messages.push({
    role: "user",
    content: userMessage,
  });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      system: conversation.systemPrompt,
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

    // Determine if ready to generate plan
    // After 3-4 exchanges or if user says "done"/"ready"
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

  const finalPrompt = `Based on all the conversation history and preferences shared by the user, create a detailed and highly personalized ${initialRequest.days}-day travel itinerary for ${initialRequest.city}, ${initialRequest.country}.

Budget: $${initialRequest.budget}

Take into account ALL preferences mentioned during our conversation.

Return the response ONLY as valid JSON (no markdown, no extra text):
{
  "title": "string - catchy title",
  "overview": "string - 2-3 sentence summary",
  "personalizationNote": "string - explain why this plan matches their preferences",
  "dailyItinerary": [
    {
      "day": number,
      "theme": "string",
      "activities": [
        {
          "time": "string (HH:MM format)",
          "activity": "string",
          "location": "string",
          "estimatedCost": number,
          "description": "string",
          "whyIncluded": "string - why we included this based on preferences"
        }
      ],
      "restaurants": [
        {
          "name": "string",
          "cuisine": "string",
          "estimatedCost": number,
          "whyRecommended": "string"
        }
      ],
      "dayBudget": number
    }
  ],
  "totalEstimatedCost": number,
  "packingTips": ["string"],
  "localTips": ["string"],
  "safetyTips": ["string"],
  "bestTimeToVisit": "string",
  "gettingAround": "string"
}`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      system:
        "You are an expert travel planner. Create detailed, personalized itineraries based on user preferences.",
      messages: [
        ...messages,
        {
          role: "user",
          content: finalPrompt,
        },
      ],
    });

    const responseText = response.content[0].text;

    // Parse JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response");
    }

    const plan = JSON.parse(jsonMatch[0]);

    // Update conversation status
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
