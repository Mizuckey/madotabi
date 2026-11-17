export type CurrentWeather = { temperature: number; code: number; time: string };
export const WEATHER_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { expires: number; value: CurrentWeather }>();
type Coordinates = readonly [latitude: number, longitude: number];
export type WeatherReading = { weather: CurrentWeather | null; error: boolean };
const MAX_STALE_MS = 60 * 60 * 1000;
const BATCH_SIZE = 10;

export const weatherKey = (latitude: number, longitude: number) => `${latitude},${longitude}`;

export function weatherLabel(code: number): string {
  if (code === 0) return "晴れ";
  if (code === 1) return "おおむね晴れ";
  if (code === 2) return "晴れ時々曇り";
  if (code === 3) return "曇り";
  if ([45, 48].includes(code)) return "霧";
  if ([51, 53, 55].includes(code)) return "霧雨";
  if ([56, 57].includes(code)) return "凍る霧雨";
  if ([61, 63, 65].includes(code)) return "雨";
  if ([66, 67].includes(code)) return "凍る雨";
  if ([71, 73, 75, 77].includes(code)) return "雪";
  if ([80, 81, 82].includes(code)) return "にわか雨";
  if ([85, 86].includes(code)) return "にわか雪";
  if ([95, 96, 97, 99].includes(code)) return "雷雨";
  return "天気不明";
}
export function weatherUrl(latitude: number, longitude: number): string {
  return batchWeatherUrl([[latitude, longitude]]);
}

function batchWeatherUrl(locations: readonly Coordinates[]): string {
  for (const [latitude, longitude] of locations) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new Error("Invalid coordinates");
    }
  }
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: locations.map(([latitude]) => latitude).join(","),
    longitude: locations.map(([, longitude]) => longitude).join(","),
    current: "temperature_2m,weather_code",
    temperature_unit: "celsius",
    timezone: "Asia/Tokyo",
    forecast_days: "1",
  }).toString();
  return url.toString();
}
export function parseWeather(body: unknown): CurrentWeather {
  if (!body || typeof body !== "object") throw new Error("Invalid weather response");
  const { current, current_units: units } = body as { current?: Record<string, unknown>; current_units?: Record<string, unknown> };
  if (!current || !units || units.temperature_2m !== "°C" || typeof current.temperature_2m !== "number" || !Number.isFinite(current.temperature_2m) || typeof current.weather_code !== "number" || !Number.isInteger(current.weather_code) || typeof current.time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(current.time)) throw new Error("Incomplete weather");
  return { temperature: current.temperature_2m, code: current.weather_code, time: current.time };
}
export async function loadPlaylistWeather(locations: readonly Coordinates[], signal: AbortSignal): Promise<Record<string, WeatherReading>> {
  const results: Record<string, WeatherReading> = {};
  const due = locations.filter(([latitude, longitude]) => {
    const key = weatherKey(latitude, longitude);
    const stored = cache.get(key);
    if (!stored || stored.expires <= Date.now()) return true;
    results[key] = { weather: stored.value, error: false };
    return false;
  });

  for (let offset = 0; offset < due.length; offset += BATCH_SIZE) {
    if (signal.aborted) break;
    const batch = due.slice(offset, offset + BATCH_SIZE);
    let rows: unknown[] = [];
    try {
      const response = await fetch(batchWeatherUrl(batch), {
        signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
      });
      if (response.ok) {
        const body: unknown = await response.json();
        const entries = Array.isArray(body) ? body : [body];
        if (entries.length === batch.length) rows = entries;
      }
    } catch {
      // The next refresh retries these locations.
    }
    if (signal.aborted) break;

    batch.forEach(([latitude, longitude], index) => {
      const key = weatherKey(latitude, longitude);
      try {
        const weather = parseWeather(rows[index]);
        if (cache.size >= 100 && !cache.has(key)) cache.delete(cache.keys().next().value!);
        cache.set(key, { expires: Date.now() + WEATHER_TTL_MS, value: weather });
        results[key] = { weather, error: false };
      } catch {
        const stored = cache.get(key);
        const age = stored ? Date.now() - stored.expires + WEATHER_TTL_MS : Infinity;
        results[key] = { weather: stored && age < MAX_STALE_MS ? stored.value : null, error: true };
      }
    });
  }

  return results;
}
