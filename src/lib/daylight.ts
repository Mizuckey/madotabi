import type { CameraVideo } from '../types/video';

export type SolarDay = { date: string; sunrise: number; sunset: number };
export type SolarReading = { days: SolarDay[]; error: boolean };
const DAY = 86400000;
const JST = 9 * 3600000;
const cache = new Map<string, { expires: number; days: SolarDay[] }>();
const pending = new Map<string, Promise<SolarDay[]>>();
export const japanDate = (time: number) => new Date(time + JST).toISOString().slice(0, 10);
export const nextJapanMidnight = (time: number) => (Math.floor((time + JST) / DAY) + 1) * DAY - JST;
export const locationKey = (latitude: number, longitude: number) => `${latitude},${longitude}`;

export function parseSolarDays(body: unknown): SolarDay[] {
  if (!body || typeof body !== 'object') throw new Error('Invalid solar response');
  const daily = (body as { daily?: { time?: unknown; sunrise?: unknown; sunset?: unknown } }).daily;
  if (!daily || !Array.isArray(daily.time) || !Array.isArray(daily.sunrise) || !Array.isArray(daily.sunset) || !daily.time.length || daily.time.length !== daily.sunrise.length || daily.time.length !== daily.sunset.length) throw new Error('Missing solar times');
  return daily.time.map((time, index) => {
    const sunrise = (daily.sunrise as unknown[])[index];
    const sunset = (daily.sunset as unknown[])[index];
    if (typeof time !== 'number' || !Number.isFinite(time) || typeof sunrise !== 'number' || !Number.isFinite(sunrise) || typeof sunset !== 'number' || !Number.isFinite(sunset) || sunrise >= sunset) throw new Error('Invalid solar times');
    const date = japanDate(time * 1000);
    if (japanDate(sunrise * 1000) !== date || japanDate(sunset * 1000) !== date) throw new Error('Mismatched solar date');
    return { date, sunrise: sunrise * 1000, sunset: sunset * 1000 };
  });
}

export function solarUrl(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('Invalid coordinates');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), daily: 'sunrise,sunset', timezone: 'Asia/Tokyo', timeformat: 'unixtime', forecast_days: '2' }).toString();
  return url.toString();
}

export function loadSolarDays(latitude: number, longitude: number): Promise<SolarDay[]> {
  const key = locationKey(latitude, longitude);
  const stored = cache.get(key);
  if (stored && stored.expires > Date.now()) return Promise.resolve(stored.days);
  const running = pending.get(key);
  if (running) return running;
  const request = fetch(solarUrl(latitude, longitude), { signal: AbortSignal.timeout(8000) }).then(async response => {
    if (!response.ok) throw new Error('Solar API unavailable');
    const days = parseSolarDays(await response.json());
    if (!days.some(day => day.date === japanDate(Date.now()))) throw new Error('Solar date unavailable');
    if (cache.size >= 100 && !cache.has(key)) cache.delete(cache.keys().next().value!);
    cache.set(key, { days, expires: nextJapanMidnight(Date.now()) });
    return days;
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export function solarDay(reading: SolarReading | undefined, now: number): SolarDay | undefined {
  return !reading?.error ? reading?.days.find(day => day.date === japanDate(now)) : undefined;
}
export function canPlayScenery(video: CameraVideo, readings: Record<string, SolarReading>, now: number): boolean {
  if (video.nightView) return true;
  if (!video.location) return false;
  const day = solarDay(readings[locationKey(video.location.latitude, video.location.longitude)], now);
  return !!day && now >= day.sunrise && now < day.sunset;
}
export function nextSolarBoundary(readings: Record<string, SolarReading>, now: number): number {
  return Math.min(now + 60_000, nextJapanMidnight(now), ...Object.values(readings).flatMap(reading => reading.days.flatMap(day => [day.sunrise, day.sunset]).filter(time => time > now)));
}
