import type { CameraVideo } from "../types/video";
import type { ChannelWatch } from "../types/channel";

export const CHANNEL_CHECK_MS = 30 * 60 * 1000;
export const MAX_WATCHED_CHANNELS = 5;
const channelIdPattern = /^UC[A-Za-z0-9_-]{22}$/;
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

/** Handle / channel ID / legacy username only. Never fetch arbitrary user URLs. */
export function parseChannelUrl(input: string) {
  try {
    if (input.length > 2048) return null;
    const url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || !["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) return null;
    const parts = decodeURIComponent(url.pathname).split("/").filter(Boolean);
    if (["live", "streams", "featured", "videos"].includes(parts.at(-1) ?? "")) parts.pop();
    let ref: string;
    let path: string;
    if (parts.length === 1 && /^@[\p{L}\p{M}\p{N}_.·\-]{1,30}$/u.test(parts[0])) {
      ref = parts[0].normalize("NFC").toLowerCase(); path = ref;
    } else if (parts.length === 2 && parts[0] === "channel" && channelIdPattern.test(parts[1])) {
      ref = parts[1]; path = `channel/${ref}`;
    } else if (parts.length === 2 && parts[0] === "user" && /^[A-Za-z0-9_-]{1,100}$/.test(parts[1])) {
      ref = `user:${parts[1].toLowerCase()}`; path = `user/${parts[1].toLowerCase()}`;
    } else return null;
    return { ref, url: `https://www.youtube.com/${path}`, title: ref.replace(/^user:/, "") };
  } catch { return null; }
}

async function youtubeRequest(resource: "channels" | "search" | "videos", params: Record<string, string>, key: string) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url, { headers: { "X-Goog-Api-Key": key }, cache: "no-store", signal: AbortSignal.timeout(6000) });
  // Do not log the request, key, token, or upstream error body.
  if (!response.ok) throw new Error("YouTube API unavailable");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !Array.isArray((body as { items?: unknown }).items)) throw new Error("Invalid YouTube response");
  return (body as { items: unknown[] }).items;
}

export async function resolveChannel(ref: string, key: string) {
  const filter: Record<string, string> | null = channelIdPattern.test(ref) ? { id: ref } : ref.startsWith("@") ? { forHandle: ref } : ref.startsWith("user:") ? { forUsername: ref.slice(5) } : null;
  if (!filter) throw new Error("Invalid channel");
  const rows = await youtubeRequest("channels", { part: "snippet", ...filter }, key);
  const row = rows[0] as { id?: unknown; snippet?: { title?: unknown } } | undefined;
  if (!row || typeof row.id !== "string" || !channelIdPattern.test(row.id) || typeof row.snippet?.title !== "string") throw new Error("Channel not found");
  return { id: row.id, title: row.snippet.title.slice(0, 200) };
}

export function parseLiveVideos(items: unknown[], channelId: string): CameraVideo[] {
  const videos = new Map<string, CameraVideo>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; snippet?: { title?: unknown; channelId?: unknown; liveBroadcastContent?: unknown }; status?: { embeddable?: unknown; privacyStatus?: unknown }; liveStreamingDetails?: { actualStartTime?: unknown; actualEndTime?: unknown } };
    if (typeof row.id !== "string" || !videoIdPattern.test(row.id) || row.snippet?.channelId !== channelId || row.snippet?.liveBroadcastContent !== "live" || typeof row.snippet?.title !== "string" || !row.snippet.title.trim() || row.status?.embeddable !== true || row.status?.privacyStatus !== "public" || typeof row.liveStreamingDetails?.actualStartTime !== "string" || !Number.isFinite(Date.parse(row.liveStreamingDetails.actualStartTime)) || row.liveStreamingDetails.actualEndTime) continue;
    videos.set(row.id, { id: `live:${row.id}`, youtubeVideoId: row.id, title: row.snippet.title.slice(0, 200), location: null });
  }
  return [...videos.values()].slice(0, 5);
}

export async function findChannelLives(channelId: string, key: string): Promise<CameraVideo[]> {
  if (!channelIdPattern.test(channelId)) throw new Error("Invalid channel ID");
  const items = await youtubeRequest("search", { part: "snippet", channelId, eventType: "live", type: "video", videoEmbeddable: "true", maxResults: "5" }, key);
  const ids = items.flatMap(item => {
    const id = (item as { id?: { videoId?: unknown } } | null)?.id?.videoId;
    return typeof id === "string" && videoIdPattern.test(id) ? [id] : [];
  });
  if (!ids.length) return [];
  return parseLiveVideos(await youtubeRequest("videos", { part: "snippet,status,liveStreamingDetails", id: [...new Set(ids)].join(",") }, key), channelId);
}

export async function verifyLiveVideo(videoId: string, channelId: string, key: string) {
  if (!videoIdPattern.test(videoId) || !channelIdPattern.test(channelId)) return null;
  return parseLiveVideos(await youtubeRequest("videos", { part: "snippet,status,liveStreamingDetails", id: videoId }, key), channelId).find(video => video.youtubeVideoId === videoId) ?? null;
}

export function channelNotifications(channels: ChannelWatch[], dismissed: ReadonlySet<string>, now = Date.now()) {
  const seen = new Set<string>();
  return channels.flatMap(channel => {
    if (!channel.enabled || channel.last_error || !channel.last_checked_at || now - Date.parse(channel.last_checked_at) >= CHANNEL_CHECK_MS || !Number.isFinite(Date.parse(channel.last_checked_at))) return [];
    return (Array.isArray(channel.live_videos) ? channel.live_videos : []).filter(video => {
      if (!video || typeof video.youtubeVideoId !== "string" || typeof video.title !== "string" || !videoIdPattern.test(video.youtubeVideoId) || dismissed.has(video.youtubeVideoId) || seen.has(video.youtubeVideoId)) return false;
      seen.add(video.youtubeVideoId); return true;
    }).map(video => ({ channelId: channel.id, channelTitle: channel.channel_title, video }));
  });
}
