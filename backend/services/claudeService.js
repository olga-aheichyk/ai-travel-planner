import Anthropic from "@anthropic-ai/sdk";

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
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Парсим JSON из ответа
    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
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

// Получение рекомендаций по ресторанам
export async function getRestaurantRecommendations(city, cuisine, budget) {
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1500,
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
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  return JSON.parse(jsonMatch[0]);
}
