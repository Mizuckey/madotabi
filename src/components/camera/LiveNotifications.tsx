"use client";

import { useState } from "react";
import type { CameraVideo } from "@/types/video";

type Notice = { channelId: string; channelTitle: string; video: CameraVideo };
export function LiveNotifications({ notifications, onWatch, onDismiss }: { notifications: Notice[]; onWatch(videoId: string): Promise<void>; onDismiss(videoId: string): void }) {
  const [opening, setOpening] = useState<string | null>(null);
  if (!notifications.length) return null;
  async function watch(videoId: string) {
    if (opening) return;
    setOpening(videoId);
    try { await onWatch(videoId); } finally { setOpening(null); }
  }
  return <section className="live-notifications" aria-label="チャンネルのライブ通知">
    <p className="sr-only" role="status">登録チャンネルで{notifications.length}件のライブ配信を見つけました。</p>
    {notifications.map(({ channelTitle, video }) => <div className="live-notification" key={video.youtubeVideoId}>
      <p title={`${channelTitle}：${video.title}`}><span className="status-dot" aria-hidden="true" />ライブ配信中 · {channelTitle}<strong>{video.title}</strong></p>
      <button className="admin-secondary" type="button" disabled={!!opening} onClick={() => void watch(video.youtubeVideoId)}>{opening === video.youtubeVideoId ? "確認中…" : "ライブを見る"}</button>
      <button className="admin-secondary" type="button" aria-label={`${video.title}の通知を閉じる`} onClick={() => onDismiss(video.youtubeVideoId)}>×</button>
    </div>)}
  </section>;
}
