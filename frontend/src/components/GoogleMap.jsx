import { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  InfoWindow,
} from "@react-google-maps/api";
import { useGoogleMapLoader } from "../hooks/useGoogleMapLoader";
import "../styles/GoogleMap.css";

export function GoogleMapComponent({ plan }) {
  const { isLoaded, loadError } = useGoogleMapLoader();
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 }); // Default: New York
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [route, setRoute] = useState([]);
  const mapRef = useRef(null);

  // Обработать загрузку планов и геокодирование
  useEffect(() => {
    if (!isLoaded || !plan) return;

    processItinerary();
  }, [plan, isLoaded]);

  const processItinerary = async () => {
    if (!plan || !plan.dailyItinerary) return;

    // Собираем все активности
    const allActivities = [];
    plan.dailyItinerary.forEach((day) => {
      day.activities.forEach((activity, idx) => {
        allActivities.push({
          day: day.day,
          activityIndex: idx + 1,
          ...activity,
        });
      });
    });

    // Геокодируем каждое место (получаем координаты по названию)
    const geocodedActivities = await geocodeActivities(
      allActivities,
      plan.destination?.city || "Unknown City",
    );

    setRoute(geocodedActivities);

    // Устанавливаем центр карты на первую активность
    if (geocodedActivities.length > 0) {
      setMapCenter({
        lat: geocodedActivities[0].lat,
        lng: geocodedActivities[0].lng,
      });
    }
  };

  // Геокодирование - получение координат по названию места
  const geocodeActivities = async (activities, city) => {
    const geocoder = new window.google.maps.Geocoder();
    const geocodedActivities = [];

    for (const activity of activities) {
      try {
        // Улучшенный адрес для поиска
        const address = `${activity.location}, ${city}`;

        const results = await new Promise((resolve, reject) => {
          geocoder.geocode({ address }, (results, status) => {
            if (status === "OK" && results[0]) {
              resolve(results[0]);
            } else {
              // Если точный адрес не найден, ищем по общему местоположению
              geocoder.geocode({ address: city }, (results, status) => {
                if (status === "OK" && results[0]) {
                  resolve(results[0]);
                } else {
                  reject(new Error(`Geocoding failed for ${address}`));
                }
              });
            }
          });
        });

        geocodedActivities.push({
          ...activity,
          lat: results.geometry.location.lat(),
          lng: results.geometry.location.lng(),
          formattedAddress: results.formatted_address,
        });
      } catch (error) {
        console.warn(`Could not geocode ${activity.location}:`, error);
        // Добавляем с дефолтными координатами
        geocodedActivities.push({
          ...activity,
          lat: mapCenter.lat,
          lng: mapCenter.lng,
        });
      }
    }

    return geocodedActivities;
  };

  if (loadError) {
    return <div className="map-error">Error loading maps: {loadError}</div>;
  }

  if (!isLoaded) {
    return <div className="map-loading">Loading maps...</div>;
  }

  // Создаём линию маршрута (polyline)
  const routeCoordinates = route.map((activity) => ({
    lat: activity.lat,
    lng: activity.lng,
  }));

  return (
    <div className="google-map-container">
      <div className="map-header">
        <h3>🗺️ Your Trip Route</h3>
        <p className="map-info">
          {route.length} stops • Click on markers for details
        </p>
      </div>

      <GoogleMap
        mapContainerClassName="map-container"
        center={mapCenter}
        zoom={13}
        onLoad={(map) => (mapRef.current = map)}
        options={{
          styles: mapStyles,
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: false,
        }}
      >
        {/* Линия маршрута */}
        {routeCoordinates.length > 1 && (
          <Polyline
            path={routeCoordinates}
            options={{
              strokeColor: "#0066cc",
              strokeOpacity: 0.7,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        )}

        {/* Маркеры для каждой активности */}
        {route.map((activity, idx) => (
          <Marker
            key={idx}
            position={{ lat: activity.lat, lng: activity.lng }}
            title={activity.activity}
            onClick={() => setSelectedMarker(idx)}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: getMarkerColor(activity.day),
              fillOpacity: 0.8,
              strokeColor: "#fff",
              strokeWeight: 2,
            }}
            label={{
              text: `${activity.day}.${activity.activityIndex}`,
              color: "#fff",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {selectedMarker === idx && (
              <InfoWindow
                onCloseClick={() => setSelectedMarker(null)}
                options={{
                  pixelOffset: new window.google.maps.Size(0, -40),
                }}
              >
                <div className="info-window">
                  <h4>{activity.activity}</h4>
                  <p className="location">📍 {activity.location}</p>
                  <p className="time">🕐 {activity.time}</p>
                  <p className="description">{activity.description}</p>
                  <p className="cost">💵 ${activity.estimatedCost}</p>
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>

      {/* Легенда маршрута */}
      <div className="map-legend">
        <h4>Timeline</h4>
        <div className="legend-items">
          {route.map((activity, idx) => (
            <div
              key={idx}
              className="legend-item"
              onClick={() => {
                setSelectedMarker(idx);
                // Скроллим карту к маркеру
                mapRef.current?.panTo({
                  lat: activity.lat,
                  lng: activity.lng,
                });
              }}
              style={{
                borderLeftColor: getMarkerColor(activity.day),
              }}
            >
              <div className="legend-time">
                Day {activity.day} • {activity.time}
              </div>
              <div className="legend-activity">{activity.activity}</div>
              <div className="legend-location">{activity.location}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Функция для выбора цвета маркера в зависимости от дня
function getMarkerColor(day) {
  const colors = [
    "#ff6b6b", // День 1 - красный
    "#4ecdc4", // День 2 - бирюзовый
    "#45b7d1", // День 3 - голубой
    "#ffa502", // День 4 - оранжевый
    "#96ceb4", // День 5 - зелёный
    "#dfe6e9", // День 6 - серый
  ];
  return colors[(day - 1) % colors.length];
}

// Google Maps стили для красивого вида
const mapStyles = [
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0066cc" }],
  },
  {
    featureType: "landscape",
    elementType: "all",
    stylers: [{ color: "#f2f2f2" }],
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "all",
    stylers: [{ saturation: -100 }, { lightness: 45 }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "water",
    elementType: "all",
    stylers: [{ color: "#d3e0f2" }],
  },
];
