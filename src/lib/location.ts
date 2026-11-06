import type { CameraLocation, LocationColumns } from "../types/location";

export function validCoordinates(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function locationFromRow(row: Partial<LocationColumns>): CameraLocation | null {
  if (!row.location_name || !validCoordinates(row.latitude, row.longitude)) return null;
  return { name: row.location_name, latitude: row.latitude!, longitude: row.longitude! };
}
export function locationColumns(value: CameraLocation | null): LocationColumns {
  return { location_name: value?.name ?? null, latitude: value?.latitude ?? null, longitude: value?.longitude ?? null };
}

export function locationQueryFromTitle(title: string): string {
  return title.normalize("NFKC").replace(/[【】\[\]]/g, " ")
    .replace(/live\s*camera|live\s*stream(?:ing)?|ライブ(?:カメラ|配信|中継)?|定点カメラ|生中継|\blive\b|\b[248]k\b/gi, " ")
    .split(/[|｜/／]/)[0].replace(/^[\s・:：-]+|[\s・:：-]+$/g, "").replace(/\s+/g, " ").slice(0, 100);
}
export function locationSearchTerms(query: string): string[] {
  const text = query.normalize("NFKC").trim().replace(/^(.{2,3}[都道府県])\s*[/／]\s*(.+)$/, "$2, $1");
  if (text.length < 2) return [];
  const [name, qualifier] = text.split(",").map(value => value.trim());
  const pref = !qualifier ? name.match(/^(.{2,3}[都道府県])\s*(.+)$/) : null;
  const place = pref ? pref[2] : name;
  const area = qualifier || pref?.[1];
  const base = place.match(/^(.+?[市区町村])(?:\s|[^市区町村]|$)/)?.[1] ?? place;
  const word = base.split(/\s/)[0];
  const candidates = [base, base.replace(/[市区町村]$/, "")];
  if (!/[市区町村]$/.test(base) && /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word)) {
    // Open-Meteo requires exact matches for two characters: 札幌 does not match 札幌市.
    const short = word.slice(0, 2);
    candidates.push(short, `${short}市`, word.slice(0, 3));
  }
  return [...new Set(candidates.filter(value => value.length >= 2).map(value => area ? `${value}, ${area}` : value))].slice(0, 5);
}
export function parseLocations(body: unknown): CameraLocation[] {
  if (!body || typeof body !== "object") throw new Error("Invalid location response");
  const results = (body as { results?: unknown }).results;
  if (results === undefined) return [];
  if (!Array.isArray(results)) throw new Error("Invalid locations");
  const locations: CameraLocation[] = [];
  for (const row of results) {
    if (!row || typeof row !== "object" || row.country_code !== "JP" || typeof row.name !== "string" || !validCoordinates(row.latitude, row.longitude)) continue;
    const name = [...new Set([row.admin1, row.name].filter(value => typeof value === "string" && value.trim()))].join(" / ");
    if (name.length > 160 || !name) continue;
    if (!locations.some(value => value.latitude === row.latitude && value.longitude === row.longitude)) locations.push({ name, latitude: row.latitude, longitude: row.longitude });
  }
  return locations.slice(0, 5);
}
export async function searchLocations(query: string, signal: AbortSignal): Promise<CameraLocation[]> {
  for (const term of locationSearchTerms(query)) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({ name: term, language: "ja", count: "5", countryCode: "JP" }).toString();
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
    if (!response.ok) throw new Error("Location search unavailable");
    const candidates = parseLocations(await response.json());
    if (candidates.length) return candidates;
  }
  return [];
}
