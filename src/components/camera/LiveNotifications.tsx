"use client";

import { useEffect, useState } from "react";
import type { CameraVideo } from "@/types/video";

type Notice = { channelId: string; channelTitle: string; video: CameraVideo };
type Props = { notifications: Notice[]; onWatch(videoId: string): Promise<void>; onDismiss(videoId: string): void };
export function LiveNotifications(props: Props) {
  if (!props.notifications.length) return null;
  return <NotificationCarousel key={props.notifications.map(notice => notice.video.youtubeVideoId).join(',')} {...props} />;
}

function NotificationCarousel({ notifications, onWatch, onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  const [opening, setOpening] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const notice = notifications[index];
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (notifications.length < 2 || opening || hovered || focused || reducedMotion.matches) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setIndex(current => (current + 1) % notifications.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [notifications.length, opening, hovered, focused]);
  async function watch() {
    if (opening) return;
    setOpening(true);
    try { await onWatch(notice.video.youtubeVideoId); } finally { setOpening(false); }
  }
  return <section className="live-notifications" aria-label="チャンネルのライブ通知" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <span className="sr-only" role="status">ライブ配信が{notifications.length}件あります。</span>
    <span className="live-notification-message" key={notice.video.youtubeVideoId} title={`${notice.channelTitle}：${notice.video.title}`}><span className="status-dot" aria-hidden="true" />ライブ · {notice.channelTitle} · {notice.video.title}</span>
    {notifications.length > 1 && <button className="admin-secondary notice-next" type="button" aria-label={`次のライブ通知（${index + 1}/${notifications.length}）`} disabled={opening} onClick={() => setIndex(current => (current + 1) % notifications.length)}>{index + 1}/{notifications.length}</button>}
    <button className="admin-secondary" type="button" disabled={opening} onClick={() => void watch()} aria-label={`${notice.video.title}のライブを見る`}>{opening ? "確認中" : "見る"}</button>
    <button className="admin-secondary" type="button" disabled={opening} aria-label={`${notice.video.title}の通知を閉じる`} onClick={() => onDismiss(notice.video.youtubeVideoId)}>×</button>
  </section>;
}
