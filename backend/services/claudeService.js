import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateTravelPlan(planParams) {
  const { city, country, days, budget, interests, travelStyle } = planParams;

  const prompt = `You are an expert travel planner. Create a detailed ${days}-day travel itinerary for ${city}, ${country}.

Budget: $${budget} USD
Travel Style: ${travelStyle} (luxury, budget, adventure, cultural, etc.)
Interests: ${interests.join(", ")}

Provide the response in the following JSON format:
{
  "title": "string",
  "overview": "string",
  "dailyItinerary": [
    {
      "day": number,
      "theme": "string",
      "activities": [
        {
          "time": "string (HH:MM)",
          "activity": "string",
          "location": "string",
          "estimatedCost": number,
          "description": "string"
        }
      ],
      "restaurants": [
        {
          "name": "string",
          "cuisine": "string",
          "estimatedCost": number,
          "coordinates": {"lat": number, "lng": number}
        }
      ]
    }
  ],
  "totalEstimatedCost": number,
  "packingTips": ["string"],
  "localTips": ["string"],
  "safetyTips": ["string"]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].text;
    const start = responseText.indexOf("{");
    const end = responseText.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found in response");
    return JSON.parse(responseText.slice(start, end + 1));
  } catch (error) {
    console.error("Claude API error:", error);
    throw error;
  }
}

// Для streaming ответов
export async function* streamTravelPlanChunks(planParams) {
  const { city, country, days, budget, interests, travelStyle } = planParams;

  const prompt = `You are an expert travel planner. Create a detailed ${days}-day travel itinerary for ${city}, ${country}.

Budget: $${budget} USD
Travel Style: ${travelStyle}
Interests: ${interests.join(", ")}

Provide engaging descriptions for each day and activity.`;

  const stream = await client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}

// In-memory conversation store
const conversations = new Map();

export function createConversation(initialRequest) {
  const id = Math.random().toString(36).slice(2);
  conversations.set(id, {
    initialRequest,
    messages: [],
  });
  return id;
}

export function getConversation(id) {
  return conversations.get(id) || null;
}

export async function continueConversation(id, userMessage) {
  const conv = conversations.get(id);
  if (!conv) throw new Error("Conversation not found");

  conv.messages.push({ role: "user", content: userMessage });

  const { city, country, days, budget } = conv.initialRequest;
  const userTurns = conv.messages.filter((m) => m.role === "user").length;
  const systemPrompt = `You are a friendly travel planning assistant helping plan a ${days}-day trip to ${city}, ${country} with a budget of $${budget}.
Ask short clarifying questions (one at a time) about travel style, interests, dietary preferences, accommodation type, or mobility needs.
${userTurns >= 3 ? 'You have gathered enough information. End your response with the exact token: READY_FOR_PLAN' : 'Do NOT include READY_FOR_PLAN yet — keep asking questions.'}`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 500,
    system: systemPrompt,
    messages: conv.messages,
  });

  const assistantMessage = message.content[0].text;
  conv.messages.push({ role: "assistant", content: assistantMessage });

  const isReadyForPlan = assistantMessage.includes("READY_FOR_PLAN");
  return { assistantMessage: assistantMessage.replace("READY_FOR_PLAN", "").trim(), isReadyForPlan };
}

export async function finalizeConversationPlan(id) {
  const conv = conversations.get(id);
  if (!conv) throw new Error("Conversation not found");

  const { city, country, days, budget } = conv.initialRequest;
  const history = conv.messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `You are an expert travel planner. Based on this conversation with the traveler, create a detailed ${days}-day itinerary for ${city}, ${country} with a $${budget} budget.

Conversation:
${history}

Respond ONLY with valid JSON in this exact format:
{
  "title": "string",
  "overview": "string",
  "personalizationNote": "string",
  "totalEstimatedCost": number,
  "bestTimeToVisit": "string",
  "gettingAround": "string",
  "dailyItinerary": [
    {
      "day": number,
      "theme": "string",
      "dayBudget": number,
      "activities": [
        {
          "time": "string",
          "activity": "string",
          "location": "string",
          "estimatedCost": number,
          "description": "string",
          "whyIncluded": "string"
        }
      ],
      "restaurants": [
        {
          "name": "string",
          "cuisine": "string",
          "estimatedCost": number,
          "whyRecommended": "string"
        }
      ]
    }
  ],
  "packingTips": ["string"],
  "localTips": ["string"],
  "safetyTips": ["string"]
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content[0].text;
  const start = responseText.indexOf("{");
  const end = responseText.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in response");
  conversations.delete(id);
  return JSON.parse(responseText.slice(start, end + 1));
}

// Получение рекомендаций по ресторанам
export async function getRestaurantRecommendations(city, cuisine, budget) {
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Recommend 5 best ${cuisine} restaurants in ${city} within $${budget} budget per person.
        Include: name, estimated cost, address, specialty dish, why to visit.
        Format as JSON array.`,
      },
    ],
  });

  const responseText = message.content[0].text;
  const start = responseText.indexOf("[");
  const end = responseText.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in response");
  return JSON.parse(responseText.slice(start, end + 1));
}
