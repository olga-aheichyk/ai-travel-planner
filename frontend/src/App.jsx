import { useState } from "react";
import { SearchForm } from "./components/SearchForm";
import { ConversationChat } from "./components/ConversationChat";
import { Itinerary } from "./components/Itinerary";
import { useConversation } from "./hooks/useConversation";
import "./App.css";

function App() {
  const {
    messages,
    loading,
    error,
    stage,
    startConversation,
    sendMessage,
    finalizePlan,
    reset,
  } = useConversation();

  const [finalPlan, setFinalPlan] = useState(null);

  const handleSearchSubmit = async (formData) => {
    await startConversation(formData);
  };

  const handleFinalizePlan = async () => {
    const plan = await finalizePlan();
    if (plan) {
      setFinalPlan(plan);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>✈️ AI Travel Planner</h1>
        <p>Create your perfect personalized itinerary with AI</p>
      </header>

      <main className="container">
        {stage === "init" && (
          <SearchForm onSearch={handleSearchSubmit} loading={loading} />
        )}

        {(stage === "conversation" || stage === "ready_for_plan") && (
          <div className="conversation-section">
            <h2>Let's personalize your trip! 🎯</h2>
            <ConversationChat
              messages={messages}
              loading={loading}
              onSendMessage={sendMessage}
              onFinalize={handleFinalizePlan}
              stage={stage}
            />
          </div>
        )}

        {stage === "completed" && finalPlan && (
          <div className="completed-section">
            <button onClick={reset} className="new-plan-btn">
              ← Plan Another Trip
            </button>
            <Itinerary plan={finalPlan} />
          </div>
        )}

        {error && <div className="error-message">❌ {error}</div>}
      </main>
    </div>
  );
}

export default App;
