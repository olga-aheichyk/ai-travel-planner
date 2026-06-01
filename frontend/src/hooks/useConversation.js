import { useState } from "react";

const API_URL = "http://localhost:5000/api/travel";

export function useConversation() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState("init"); // init, conversation, completed

  // Initialize conversation
  const startConversation = async (initialRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/conversation/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialRequest),
      });

      if (!response.ok) throw new Error("Failed to initialize conversation");
      const data = await response.json();

      setConversationId(data.conversationId);
      setMessages([
        {
          role: "assistant",
          content: data.assistantMessage,
        },
      ]);
      setStage("conversation");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Send user message
  const sendMessage = async (userMessage) => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      // Add user message to UI
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: userMessage,
        },
      ]);

      const response = await fetch(
        `${API_URL}/conversation/${conversationId}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage }),
        },
      );

      if (!response.ok) throw new Error("Failed to send message");
      const data = await response.json();

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.assistantMessage,
        },
      ]);

      // If ready for plan, move to next stage
      if (data.isReadyForPlan) {
        setStage("ready_for_plan");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate final plan
  const finalizePlan = async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/conversation/${conversationId}/finalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) throw new Error("Failed to generate plan");
      const plan = await response.json();

      setStage("completed");
      return plan;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset conversation
  const reset = () => {
    setConversationId(null);
    setMessages([]);
    setStage("init");
  };

  return {
    conversationId,
    messages,
    loading,
    error,
    stage,
    startConversation,
    sendMessage,
    finalizePlan,
    reset,
  };
}
