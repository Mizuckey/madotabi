export type CurrentWeather = { temperature: number; code: number; time: string };
export const WEATHER_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { expires: number; value: CurrentWeather }>();
const pending = new Map<string, Promise<CurrentWeather>>();

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
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error("Invalid coordinates");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: "temperature_2m,weather_code", temperature_unit: "celsius", timezone: "Asia/Tokyo", forecast_days: "1" }).toString();
  return url.toString();
}
export function parseWeather(body: unknown): CurrentWeather {
  if (!body || typeof body !== "object") throw new Error("Invalid weather response");
  const { current, current_units: units } = body as { current?: Record<string, unknown>; current_units?: Record<string, unknown> };
  if (!current || !units || units.temperature_2m !== "°C" || typeof current.temperature_2m !== "number" || !Number.isFinite(current.temperature_2m) || typeof current.weather_code !== "number" || !Number.isInteger(current.weather_code) || typeof current.time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(current.time)) throw new Error("Incomplete weather");
  return { temperature: current.temperature_2m, code: current.weather_code, time: current.time };
}
export function loadWeather(latitude: number, longitude: number, force = false): Promise<CurrentWeather> {
  const key = `${latitude},${longitude}`;
  const cached = cache.get(key);
  if (!force && cached && cached.expires > Date.now()) return Promise.resolve(cached.value);
  const running = pending.get(key);
  if (running) return running;
  const request = fetch(weatherUrl(latitude, longitude), { signal: AbortSignal.timeout(8000) }).then(async response => {
    if (!response.ok) throw new Error("Weather unavailable");
    const value = parseWeather(await response.json());
    if (cache.size >= 100 && !cache.has(key)) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + WEATHER_TTL_MS });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
