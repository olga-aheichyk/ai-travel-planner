import { useEffect, useState } from "react";

export function useGoogleMapLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setLoadError("Google Maps API key is not set");
      return;
    }

    // Проверяем, загружена ли уже библиотека
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // Загружаем Google Maps API
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places,geocoding`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setLoadError("Failed to load Google Maps");
    };

    document.head.appendChild(script);

    return () => {
      // Не удаляем скрипт, чтобы не перезагружать на каждый ре-рендер
    };
  }, []);

  return { isLoaded, loadError };
}
