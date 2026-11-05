"use client";

import { useEffect, useState } from "react";
import type { CameraLocation } from "@/types/location";
import { loadWeather, WEATHER_TTL_MS, type CurrentWeather } from "@/lib/weather";

export function useLocationWeather(location?: CameraLocation | null) {
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const key = latitude !== undefined && longitude !== undefined ? `${latitude},${longitude}` : null;
  const [result, setResult] = useState<{ key: string; weather: CurrentWeather | null; error: boolean } | null>(null);
  useEffect(() => {
    if (latitude === undefined || longitude === undefined || !key) return;
    let active = true;
    const refresh = (force = false) => {
      void loadWeather(latitude, longitude, force).then(weather => { if (active) setResult({ key, weather, error: false }); }, () => { if (active) setResult({ key, weather: null, error: true }); });
    };
    refresh();
    const timer = setInterval(() => refresh(true), WEATHER_TTL_MS);
    return () => { active = false; clearInterval(timer); };
  }, [latitude, longitude, key]);
  return key && result?.key === key ? result : null;
}
