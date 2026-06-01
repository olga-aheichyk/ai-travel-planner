import { useState } from "react";
import "../styles/SearchForm.css";

export function SearchForm({ onSearch, loading }) {
  const [formData, setFormData] = useState({
    city: "",
    country: "",
    days: 3,
    budget: 1000,
    interests: [],
    travelStyle: "balanced",
  });

  const interests = [
    "Culture",
    "Nature",
    "Food",
    "Adventure",
    "Shopping",
    "Nightlife",
  ];
  const travelStyles = [
    "budget",
    "balanced",
    "luxury",
    "adventure",
    "cultural",
  ];

  const handleInterestChange = (interest) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.city && formData.country) {
      onSearch(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="form-group">
        <label>City</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="e.g., Barcelona"
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

      <div className="form-group">
        <label>Travel Style</label>
        <select
          value={formData.travelStyle}
          onChange={(e) =>
            setFormData({ ...formData, travelStyle: e.target.value })
          }
        >
          {travelStyles.map((style) => (
            <option key={style} value={style}>
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Interests</label>
        <div className="interests-grid">
          {interests.map((interest) => (
            <label key={interest} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.interests.includes(interest)}
                onChange={() => handleInterestChange(interest)}
              />
              {interest}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? "Creating your itinerary..." : "Generate Itinerary"}
      </button>
    </form>
  );
}
