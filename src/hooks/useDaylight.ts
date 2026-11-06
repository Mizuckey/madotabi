"use client";

import { useEffect, useState } from 'react';
import type { CameraVideo } from '@/types/video';
import { loadSolarDays, locationKey, nextSolarBoundary, type SolarReading } from '@/lib/daylight';

export function useDaylight(videos: CameraVideo[]) {
  const coordinates = JSON.stringify([...new Map(videos.flatMap(video => video.location ? [[locationKey(video.location.latitude, video.location.longitude), [video.location.latitude, video.location.longitude]] as const] : [])).values()]);
  const [readings, setReadings] = useState<Record<string, SolarReading>>({});
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const locations = JSON.parse(coordinates) as [number, number][];
    if (!locations.length) return;
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      const results = await Promise.allSettled(locations.map(async ([latitude, longitude]) => {
        const key = locationKey(latitude, longitude);
        try { return [key, { days: await loadSolarDays(latitude, longitude), error: false }] as const; }
        catch { return [key, { days: [], error: true }] as const; }
      }));
      if (active) { setReadings(Object.fromEntries(results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []))); setNow(Date.now()); }
    };
    const visible = () => { if (document.visibilityState === 'visible') { setNow(Date.now()); void refresh(); } };
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 5 * 60_000);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; clearInterval(interval); document.removeEventListener('visibilitychange', visible); };
  }, [coordinates]);
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, nextSolarBoundary(readings, Date.now()) - Date.now()) + 10);
    return () => clearTimeout(timer);
  }, [now, readings]);
  return { readings, now };
}
