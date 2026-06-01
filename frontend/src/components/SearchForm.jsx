import { useState } from "react";
import "../styles/SearchForm.css";

export function SearchForm({ onSearch, loading }) {
  const [formData, setFormData] = useState({
    city: "",
    country: "",
    days: 3,
    budget: 1000,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.city && formData.country) {
      onSearch(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <h2>Start Your Journey 🌍</h2>

      <div className="form-group">
        <label>City</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="e.g., Barcelona"
          required
        />
      </div>

      <div className="form-group">
        <label>Country</label>
        <input
          type="text"
          value={formData.country}
          onChange={(e) =>
            setFormData({ ...formData, country: e.target.value })
          }
          placeholder="e.g., Spain"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Days</label>
          <input
            type="number"
            min="1"
            max="30"
            value={formData.days}
            onChange={(e) =>
              setFormData({ ...formData, days: parseInt(e.target.value) })
            }
          />
        </div>

        <div className="form-group">
          <label>Budget (USD)</label>
          <input
            type="number"
            min="100"
            step="100"
            value={formData.budget}
            onChange={(e) =>
              setFormData({ ...formData, budget: parseInt(e.target.value) })
            }
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? "Starting conversation..." : "Start Planning"}
      </button>

      <p className="form-hint">
        💡 Next, answer a few questions to personalize your itinerary
      </p>
    </form>
  );
}
