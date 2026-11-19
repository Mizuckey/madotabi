"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChannelWatch } from "@/types/channel";
import { channelNotifications, CHANNEL_CHECK_MS } from "@/lib/youtube-channel";
import { startVisibleChannelChecks } from "@/lib/channel-monitor";

export function useChannelMonitor(supabase: SupabaseClient) {
  const [channels, setChannels] = useState<ChannelWatch[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState<Set<string>>(() => new Set());
  const requestRef = useRef<AbortController | null>(null);
  const lastRequest = useRef(0);

  const refresh = useCallback(async (manual = false) => {
    if (document.visibilityState !== "visible" || requestRef.current || (!manual && Date.now() - lastRequest.current < CHANNEL_CHECK_MS)) return;
    const controller = new AbortController();
    requestRef.current = controller; lastRequest.current = Date.now(); setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session unavailable");
      const response = await fetch("/api/channels/check", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Check unavailable");
      const data = await response.json() as { channels: ChannelWatch[]; configured: boolean };
      if (controller.signal.aborted) return;
      setUnavailable(new Set());
      setChannels(data.channels); setConfigured(data.configured); setError("");
    } catch { if (!controller.signal.aborted) { setError("チャンネルを確認できませんでした。通信状況を確認して再度お試しください。"); lastRequest.current = Date.now() - CHANNEL_CHECK_MS + 60_000; } }
    finally { if (requestRef.current === controller) { requestRef.current = null; setBusy(false); } }
  }, [supabase]);

  useEffect(() => {
    const stop = startVisibleChannelChecks(() => { void refresh(); });
    return () => {
      stop();
      requestRef.current?.abort(); requestRef.current = null; lastRequest.current = 0;
    };
  }, [refresh]);

  const skipLive = useCallback((videoId: string) => {
    setUnavailable(current => current.has(videoId) ? current : new Set(current).add(videoId));
  }, []);

  return {
    channels, configured, busy, error, refresh, skipLive,
    liveVideos: configured === true ? channelNotifications(channels, unavailable).map(notice => notice.video) : [],
  };
}
