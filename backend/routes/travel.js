import express from "express";
import {
  generateTravelPlan,
  getRestaurantRecommendations,
  streamTravelPlanChunks,
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

export default router;