import { createClient } from "@supabase/supabase-js";
import { CHANNEL_FIELDS, type ChannelWatch } from "@/types/channel";
import { findChannelLives, parseChannelUrl, resolveChannel, verifyLiveVideo } from "@/lib/youtube-channel";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };

/** The browser calls this only while visible. Bearer token + DB owner RLS on every request. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403, headers });
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization) || authorization.length > 8192) return Response.json({ error: "unauthorized" }, { status: 401, headers });
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return Response.json({ error: "unavailable" }, { status: 503, headers });
  const supabase = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return Response.json({ error: "unauthorized" }, { status: 401, headers });
    const { data: allowed, error: accessError } = await supabase.rpc("is_camera_admin");
    if (accessError || allowed !== true) return Response.json({ error: "forbidden" }, { status: 403, headers });
    const load = async () => {
      const { data, error } = await supabase.from("channel_watches").select(CHANNEL_FIELDS).eq("created_by", auth.user.id).order("created_at").limit(100).returns<ChannelWatch[]>();
      if (error) throw new Error("Collection unavailable");
      return data ?? [];
    };
    const watches = await load();
    const key = process.env.YOUTUBE_DATA_API_KEY;
    if (!key) return Response.json({ channels: watches, configured: false }, { headers });
    const requestedVideo = new URL(request.url).searchParams.get("video");
    if (requestedVideo) {
      const watch = watches.find(row => row.enabled && row.channel_id && row.live_videos.some(video => video?.youtubeVideoId === requestedVideo));
      const video = watch?.channel_id ? await verifyLiveVideo(requestedVideo, watch.channel_id, key) : null;
      return Response.json(video ? { video } : { error: "not_live" }, { status: video ? 200 : 409, headers });
    }
    const checks = await Promise.allSettled(watches.filter(row => row.enabled).slice(0, 5).map(async watch => {
      const { data: token, error } = await supabase.rpc("claim_channel_check", { watch_id: watch.id });
      if (error) throw new Error("Check unavailable");
      if (!token) return; // Shared 30-minute cooldown across refreshes, tabs and devices.
      let resolvedId = watch.channel_id;
      let resolvedTitle = watch.channel_title;
      let videos: ChannelWatch["live_videos"] = [];
      let failed = false;
      try {
        if (parseChannelUrl(watch.channel_url)?.ref !== watch.channel_ref) throw new Error("Invalid channel URL");
        if (!resolvedId) { const channel = await resolveChannel(watch.channel_ref, key); resolvedId = channel.id; resolvedTitle = channel.title; }
        videos = await findChannelLives(resolvedId, key);
      } catch { failed = true; }
      const saved = await supabase.rpc("finish_channel_check", { watch_id: watch.id, token, resolved_id: resolvedId, resolved_title: resolvedTitle, videos, failed });
      if (saved.error) throw new Error("Check save failed");
    }));
    if (checks.some(check => check.status === "rejected")) throw new Error("Check save failed");
    return Response.json({ channels: await load(), configured: true }, { headers });
  } catch { return Response.json({ error: "unavailable" }, { status: 503, headers }); }
}
