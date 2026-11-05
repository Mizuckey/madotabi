"use client";

import { useEffect, useRef, useState } from "react";
import type { CameraVideo } from "@/types/video";
import { buildYouTubeEmbedUrl, loadYouTubeAPI, youtubePlayerError, type YouTubePlayer } from "@/lib/youtube-player";

type Status = "loading" | "ready" | "playing" | "paused" | "buffering" | "ended" | "blocked" | "error";
const labels: Record<Status, string> = { loading: "読み込み中", ready: "再生できます", playing: "再生中", paused: "一時停止中", buffering: "バッファリング中", ended: "動画が終了しました", blocked: "再生操作が必要です", error: "再生できません" };

export function CameraPlayer({ video }: { video: CameraVideo }) {
  const [attempt, setAttempt] = useState(0);
  return <YouTubeEmbed key={`${video.youtubeVideoId}:${attempt}`} video={video} onRetry={() => setAttempt(value => value + 1)} />;
}

function YouTubeEmbed({ video, onRetry }: { video: CameraVideo; onRetry(): void }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    const iframe = document.createElement("iframe");
    iframe.title = `${video.title}（YouTubeプレーヤー）`;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    // 再生元識別に必要なRefererを保持する（YouTubeエラー153への対応）。
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.src = buildYouTubeEmbedUrl(video.youtubeVideoId, window.location.origin);
    container.replaceChildren(iframe);

    void loadYouTubeAPI().then(api => {
      if (cancelled) return;
      readyTimer = setTimeout(() => {
        if (!cancelled) { setError("YouTubeから応答がありません。通信状況を確認して再試行してください。"); setStatus("error"); }
      }, 15000);
      player.current = new api.Player(iframe, {
        events: {
          onReady(event) {
            clearTimeout(readyTimer);
            if (cancelled) return;
            setStatus("ready");
            event.target.mute();
            event.target.playVideo();
          },
          onStateChange(event) {
            if (cancelled) return;
            const states: Record<number, Status> = { 0: "ended", 1: "playing", 2: "paused", 3: "buffering", 5: "ready" };
            if (states[event.data]) setStatus(states[event.data]);
          },
          onError(event) {
            clearTimeout(readyTimer);
            if (!cancelled) { setError(youtubePlayerError(event.data)); setStatus("error"); }
          },
          onAutoplayBlocked() { if (!cancelled) setStatus("blocked"); },
        },
      });
    }).catch(() => {
      clearTimeout(readyTimer);
      if (!cancelled) { setError("YouTubeプレーヤーを読み込めませんでした。通信状況やコンテンツブロッカーを確認してください。"); setStatus("error"); }
    });

    return () => {
      cancelled = true;
      clearTimeout(readyTimer);
      player.current?.destroy();
      player.current = null;
      container.replaceChildren();
    };
  }, [video.youtubeVideoId, video.title]);

  return (
    <div className="camera-player">
      <section className="player player-live" aria-label={`${video.title}のプレーヤー領域`} data-playback-status={status}>
        <div className="youtube-host" ref={host} />
        {status === "loading" && <div className="player-loading" role="status"><span className="status-dot" />YouTubeプレーヤーを読み込んでいます…</div>}
        {status === "error" && <div className="player-error" role="alert"><h2>この動画を再生できません</h2><p>{error}</p><div><button type="button" onClick={onRetry}>再試行</button><a href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`} target="_blank" rel="noopener noreferrer">YouTubeで開く ↗</a></div></div>}
      </section>
      <div className="player-caption"><span role="status"><span className="status-dot" /> {labels[status]}</span><a href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`} target="_blank" rel="noopener noreferrer">YouTubeで開く ↗</a></div>
      {status === "blocked" ? <p className="playback-note">自動再生が制限されています。<button type="button" onClick={() => player.current?.playVideo()}>再生する</button>、または映像内の再生ボタンを押してください。</p> : <p className="playback-note">最初はミュートで再生します。音声・全画面表示は映像内の操作から変更できます。</p>}
    </div>
  );
}
