"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { PrivateWatch } from "./PrivateWatch";
import { SubmissionManager } from "./SubmissionManager";
import { useChannelMonitor } from "@/hooks/useChannelMonitor";
import { ChannelManager } from "@/components/camera/ChannelManager";
import { LiveNotifications } from "@/components/camera/LiveNotifications";
import type { CameraVideo } from "@/types/video";

export function PersonalWorkspace({ supabase, userId, initialView }: { supabase: SupabaseClient; userId: string; initialView: "watch" | "add" }) {
  const [view, setView] = useState(initialView);
  const [initialVideoId, setInitialVideoId] = useState<string>();
  const [liveVideo, setLiveVideo] = useState<CameraVideo | null>(null);
  const monitor = useChannelMonitor(supabase);
  function watch(videoId?: string) {
    setLiveVideo(null);
    setInitialVideoId(videoId);
    setView("watch");
  }
  async function watchLive(videoId: string) {
    const video = await monitor.verify(videoId);
    if (video) { setLiveVideo(video); setView("watch"); monitor.dismiss(videoId); }
  }
  return <div className="personal-workspace">
    <nav className="personal-navigation" aria-label="画面切替">
      <button type="button" className="admin-secondary" aria-pressed={view === "watch"} onClick={() => watch()}>景色を見る</button>
      <button type="button" className="admin-secondary" aria-pressed={view === "add"} onClick={() => setView("add")}>景色リスト</button>
    </nav>
    {view === "watch" && <>
      <LiveNotifications notifications={monitor.notifications} onWatch={watchLive} onDismiss={monitor.dismiss} />
      {monitor.error && <p className="channel-monitor-error" role="status">{monitor.error}<button className="admin-secondary" type="button" disabled={monitor.busy} onClick={() => void monitor.refresh(true)}>再確認</button></p>}
    </>}
    <div className={`personal-stage${view === "add" ? " is-library" : ""}`}>{view === "watch" ? <PrivateWatch key={liveVideo?.youtubeVideoId ?? "collection"} supabase={supabase} userId={userId} initialVideoId={initialVideoId} liveVideo={liveVideo} onReturn={() => watch()} /> : <>
      <ChannelManager supabase={supabase} userId={userId} channels={monitor.channels} configured={monitor.configured} checking={monitor.busy} error={monitor.error} refresh={monitor.refresh} />
      <SubmissionManager supabase={supabase} userId={userId} onWatch={watch} />
    </>}</div>
  </div>;
}
