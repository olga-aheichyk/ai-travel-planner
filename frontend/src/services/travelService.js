const API_URL = "http://localhost:5000/api/travel";

export const travelService = {
  async generatePlan(params) {
    const response = await fetch(`${API_URL}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Failed to generate plan");
    }
    return response.json();
  },

  async getRestaurants(city, cuisine, budget) {
    const response = await fetch(`${API_URL}/restaurants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, cuisine, budget }),
    });

    if (!response.ok) throw new Error("Failed to fetch restaurants");
    return response.json();
  },
};
