import express from "express";
import {
  generateTravelPlan,
  getRestaurantRecommendations,
  streamTravelPlanChunks,
  createConversation,
  getConversation,
  continueConversation,
  finalizeConversationPlan,
} from "../services/claudeService.js";

const router = express.Router();

// POST /api/travel/plan
router.post("/plan", async (req, res) => {
  try {
    const planData = req.body; // { city, country, days, budget, interests, travelStyle }

    const travelPlan = await generateTravelPlan(planData);
    res.json(travelPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/travel/plan/stream
router.post("/plan/stream", async (req, res) => {
  try {
    const planData = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of streamTravelPlanChunks(planData)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// POST /api/travel/restaurants
router.post("/restaurants", async (req, res) => {
  try {
    const { city, cuisine, budget } = req.body;
    const recommendations = await getRestaurantRecommendations(
      city,
      cuisine,
      budget,
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/travel/conversation/init
router.post("/conversation/init", async (req, res) => {
  try {
    const initialRequest = req.body; // { city, country, days, budget }
    const id = createConversation(initialRequest);

    const { city, country, days, budget } = initialRequest;
    const firstMessage = await continueConversation(id, `I want to plan a ${days}-day trip to ${city}, ${country} with a budget of $${budget}.`);

    res.json({ conversationId: id, assistantMessage: firstMessage.assistantMessage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/travel/conversation/:id/message
router.post("/conversation/:id/message", async (req, res) => {
  try {
    const { id } = req.params;
    const { userMessage } = req.body;

    if (!getConversation(id)) return res.status(404).json({ error: "Conversation not found" });

    const result = await continueConversation(id, userMessage);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/travel/conversation/:id/finalize
router.post("/conversation/:id/finalize", async (req, res) => {
  try {
    const { id } = req.params;

    if (!getConversation(id)) return res.status(404).json({ error: "Conversation not found" });

    const plan = await finalizeConversationPlan(id);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;