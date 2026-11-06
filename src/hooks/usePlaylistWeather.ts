"use client";

import { useEffect, useState } from "react";
import type { CameraVideo } from "@/types/video";
import { loadWeather, WEATHER_TTL_MS, type CurrentWeather } from "@/lib/weather";

type Reading = { weather: CurrentWeather | null; error: boolean };
export function usePlaylistWeather(videos: CameraVideo[]) {
  const coordinates = JSON.stringify([...new Map(videos.flatMap(video => video.location ? [[`${video.location.latitude},${video.location.longitude}`, [video.location.latitude, video.location.longitude]] as const] : [])).values()]);
  const [results, setResults] = useState<Record<string, Reading>>({});
  useEffect(() => {
    const locations = JSON.parse(coordinates) as [number, number][];
    if (!locations.length) return;
    let active = true;
    const refresh = async (force = false) => {
      const readings = await Promise.allSettled(locations.map(async ([latitude, longitude]) => {
        const key = `${latitude},${longitude}`;
        try { return [key, { weather: await loadWeather(latitude, longitude, force), error: false }] as const; }
        catch { return [key, { weather: null, error: true }] as const; }
      }));
      if (active) setResults(Object.fromEntries(readings.flatMap(result => result.status === "fulfilled" ? [result.value] : [])));
    };
    void refresh();
    const timer = setInterval(() => { void refresh(true); }, WEATHER_TTL_MS);
    return () => { active = false; clearInterval(timer); };
  }, [coordinates]);
  return results;
}
