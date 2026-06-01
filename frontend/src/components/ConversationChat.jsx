import { useState, useRef, useEffect } from "react";
import "../styles/ConversationChat.css";

export function ConversationChat({
  messages,
  loading,
  onSendMessage,
  onFinalize,
  stage,
}) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !loading) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="conversation-chat">
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "assistant" ? "🤖" : "👤"}
            </div>
            <div className="message-content">
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message message-assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="message-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your answer or 'Ready' to generate plan..."
          disabled={loading}
          className="message-input"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="send-btn"
        >
          Send
        </button>
      </form>

      {stage === "ready_for_plan" && (
        <button
          onClick={onFinalize}
          disabled={loading}
          className="finalize-btn"
        >
          {loading
            ? "Generating your plan..."
            : "Generate My Personalized Plan"}
        </button>
      )}
    </div>
  );
}
