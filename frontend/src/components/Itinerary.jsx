import "../styles/Itinerary.css";

export function Itinerary({ plan }) {
  if (!plan) return null;

  return (
    <div className="itinerary">
      <h1>{plan.title}</h1>
      <p className="overview">{plan.overview}</p>

      {plan.personalizationNote && (
        <div className="personalization-note">
          <strong>Why this plan matches your preferences:</strong>
          <p>{plan.personalizationNote}</p>
        </div>
      )}

      <div className="summary-stats">
        <div className="stat">
          <span className="label">Estimated Cost:</span>
          <span className="value">${plan.totalEstimatedCost}</span>
        </div>
        <div className="stat">
          <span className="label">Days:</span>
          <span className="value">{plan.dailyItinerary.length}</span>
        </div>
      </div>

      <div className="daily-plans">
        <h2>Daily Itinerary</h2>
        {plan.dailyItinerary.map((day) => (
          <DayCard key={day.day} day={day} />
        ))}
      </div>

      <div className="tips-section">
        {plan.bestTimeToVisit && (
          <InfoCard title="Best Time to Visit" content={plan.bestTimeToVisit} />
        )}
        {plan.gettingAround && (
          <InfoCard title="Getting Around" content={plan.gettingAround} />
        )}
      </div>

      <div className="tips-section">
        <TipsCard title="Packing Tips" tips={plan.packingTips} />
        <TipsCard title="Local Tips" tips={plan.localTips} />
        <TipsCard title="Safety Tips" tips={plan.safetyTips} />
      </div>
    </div>
  );
}

function DayCard({ day }) {
  return (
    <div className="day-card">
      <h3>
        Day {day.day}: {day.theme}
      </h3>

      <div className="day-budget">
        Estimated budget for this day: <strong>${day.dayBudget}</strong>
      </div>

      <div className="activities">
        <h4>Activities</h4>
        {day.activities.map((activity, idx) => (
          <div key={idx} className="activity">
            <span className="time">{activity.time}</span>
            <div className="activity-info">
              <p className="activity-name">{activity.activity}</p>
              <p className="location">📍 {activity.location}</p>
              <p className="description">{activity.description}</p>
              {activity.whyIncluded && (
                <p className="why-included">💡 {activity.whyIncluded}</p>
              )}
              <span className="cost">${activity.estimatedCost}</span>
            </div>
          </div>
        ))}
      </div>

      {day.restaurants && day.restaurants.length > 0 && (
        <div className="restaurants">
          <h4>🍽️ Restaurants</h4>
          {day.restaurants.map((rest, idx) => (
            <div key={idx} className="restaurant">
              <p className="name">{rest.name}</p>
              <p className="cuisine">{rest.cuisine}</p>
              <p className="cost">${rest.estimatedCost} per person</p>
              {rest.whyRecommended && (
                <p className="why-recommended">{rest.whyRecommended}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TipsCard({ title, tips }) {
  return (
    <div className="tips-card">
      <h4>{title}</h4>
      <ul>
        {tips.map((tip, idx) => (
          <li key={idx}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}

function InfoCard({ title, content }) {
  return (
    <div className="info-card">
      <h4>{title}</h4>
      <p>{content}</p>
    </div>
  );
}
