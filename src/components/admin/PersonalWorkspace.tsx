"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { PrivateWatch } from "./PrivateWatch";
import { SubmissionManager } from "./SubmissionManager";
import { useChannelMonitor } from "@/hooks/useChannelMonitor";
import { ChannelManager } from "@/components/camera/ChannelManager";
import { LiveNotifications } from "@/components/camera/LiveNotifications";
import type { CameraVideo } from "@/types/video";
import { BgmMenu } from "@/components/bgm/BgmMenu";

export function PersonalWorkspace({ supabase, userId, initialView }: { supabase: SupabaseClient; userId: string; initialView: "watch" | "add" }) {
  const [view, setView] = useState(initialView);
  const [initialVideoId, setInitialVideoId] = useState<string>();
  const [liveVideo, setLiveVideo] = useState<CameraVideo | null>(null);
  const [libraryTab, setLibraryTab] = useState<"videos" | "channels">("videos");
  const monitor = useChannelMonitor(supabase);
  function watch(videoId?: string) {
    setLiveVideo(null);
    setInitialVideoId(videoId);
    setView("watch");
  }
  async function watchLive(videoId: string) {
    const video = await monitor.verify(videoId);
    if (video) { setLiveVideo(video); setView("watch"); }
  }
  const notices = monitor.notifications.filter(notice => notice.video.youtubeVideoId !== liveVideo?.youtubeVideoId);
  const notification = notices.length ? <LiveNotifications notifications={notices} onWatch={watchLive} onDismiss={monitor.dismiss} /> : undefined;
  return <div className="personal-workspace">
    <BgmMenu supabase={supabase} userId={userId} />
    <nav className="personal-navigation" aria-label="画面切替">
      <button type="button" className="admin-secondary" aria-label="景色を見る" aria-pressed={view === "watch"} onClick={() => watch()}><span className="wide-nav-label">景色を見る</span><span className="compact-nav-label">見る</span></button>
      <button type="button" className="admin-secondary" aria-label="景色リスト" aria-pressed={view === "add"} onClick={() => setView("add")}><span className="wide-nav-label">景色リスト</span><span className="compact-nav-label">リスト</span></button>
    </nav>
    {view === "watch" && <>
      {monitor.error && <p className="channel-monitor-error" role="status">{monitor.error}<button className="admin-secondary" type="button" disabled={monitor.busy} onClick={() => void monitor.refresh(true)}>再確認</button></p>}
    </>}
    <div className={`personal-stage${view === "add" ? " is-library" : ""}`}>{view === "watch" ? <PrivateWatch key={liveVideo?.youtubeVideoId ?? "collection"} supabase={supabase} userId={userId} initialVideoId={initialVideoId} liveVideo={liveVideo} notification={notification} onReturn={() => watch()} /> : <>
      <nav className="scenery-list-tabs" aria-label="登録する種類"><button className="admin-secondary" type="button" aria-pressed={libraryTab === "videos"} onClick={() => setLibraryTab("videos")}>景色の登録・編集</button><button className="admin-secondary" type="button" aria-pressed={libraryTab === "channels"} onClick={() => setLibraryTab("channels")}>チャンネルの登録</button></nav>
      {libraryTab === "channels" ? <ChannelManager supabase={supabase} userId={userId} channels={monitor.channels} configured={monitor.configured} checking={monitor.busy} error={monitor.error} refresh={monitor.refresh} /> : <SubmissionManager supabase={supabase} userId={userId} onWatch={watch} />}
    </>}</div>
  </div>;
}
