import { useState } from "react";
import { travelService } from "../services/travelService";

export function useTravel() {
  const [travelPlan, setTravelPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generatePlan = async (params) => {
    setLoading(true);
    setError(null);
    try {
      const plan = await travelService.generatePlan(params);
      if (!plan || !plan.dailyItinerary) {
        throw new Error(plan?.error || "Invalid response from server");
      }
      setTravelPlan(plan);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { travelPlan, loading, error, generatePlan };
}
