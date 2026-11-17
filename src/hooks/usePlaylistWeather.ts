"use client";

import { useEffect, useState } from "react";
import type { CameraVideo } from "@/types/video";
import { loadPlaylistWeather, weatherKey, type WeatherReading } from "@/lib/weather";

const RETRY_INTERVAL_MS = 2 * 60 * 1000;

export function usePlaylistWeather(videos: CameraVideo[]) {
  const coordinates = JSON.stringify([...new Map(videos.flatMap(video => video.location
    ? [[weatherKey(video.location.latitude, video.location.longitude), [video.location.latitude, video.location.longitude]] as const]
    : [])).values()]);
  const [results, setResults] = useState<Record<string, WeatherReading>>({});

  useEffect(() => {
    const locations = JSON.parse(coordinates) as [number, number][];
    if (!locations.length) return;
    const controller = new AbortController();
    let running = false;

    async function refresh() {
      if (running || document.hidden) return;
      running = true;
      try {
        const readings = await loadPlaylistWeather(locations, controller.signal);
        if (!controller.signal.aborted) setResults(readings);
      } finally {
        running = false;
      }
    }

    void refresh();
    const timer = setInterval(() => void refresh(), RETRY_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [coordinates]);

  return results;
}
