import { useState } from "react";
import { SearchForm } from "./components/SearchForm";
import { Itinerary } from "./components/Itinerary";
import { useTravel } from "./hooks/useTravel";
import "./App.css";

function App() {
  const { travelPlan, loading, error, generatePlan } = useTravel();

  return (
    <div className="app">
      <header className="header">
        <h1>✈️ AI Travel Planner</h1>
        <p>Create your perfect itinerary with AI</p>
      </header>

      <main className="container">
        <SearchForm onSearch={generatePlan} />

        {error && <div className="error-message">{error}</div>}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Creating your personalized itinerary...</p>
          </div>
        )}

        {travelPlan && !loading && <Itinerary plan={travelPlan} />}
      </main>
    </div>
  );
}

export default App;