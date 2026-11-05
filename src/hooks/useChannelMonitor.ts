"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChannelWatch } from "@/types/channel";
import type { CameraVideo } from "@/types/video";
import { channelNotifications, CHANNEL_CHECK_MS } from "@/lib/youtube-channel";
import { startVisibleChannelChecks } from "@/lib/channel-monitor";

export function useChannelMonitor(supabase: SupabaseClient) {
  const [channels, setChannels] = useState<ChannelWatch[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
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

  const verify = async (videoId: string): Promise<CameraVideo | null> => {
    if (document.visibilityState !== "visible") return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session unavailable");
      const response = await fetch(`/api/channels/check?video=${encodeURIComponent(videoId)}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
      if (response.status === 409) { setDismissed(current => new Set(current).add(videoId)); setError("このライブは終了したか、埋め込みで再生できなくなりました。"); return null; }
      if (!response.ok) throw new Error("Verification failed");
      const result = await response.json() as { video?: CameraVideo };
      if (!result.video) throw new Error("Live unavailable");
      setError(""); return result.video;
    } catch { setError("ライブの状態を確認できませんでした。もう一度お試しください。"); return null; }
  };

  return { channels, configured, busy, error, refresh, verify, notifications: configured === true ? channelNotifications(channels, dismissed) : [], dismiss: (videoId: string) => setDismissed(current => new Set(current).add(videoId)) };
}
