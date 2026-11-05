"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CameraVideo } from "@/types/video";
import { buildYouTubeEmbedUrl, loadYouTubeAPI, youtubePlayerError, type YouTubePlayer, type PlaybackStatus } from "@/lib/youtube-player";

const labels: Record<PlaybackStatus, string> = { loading: "読み込み中", ready: "再生を準備しています", playing: "再生中", paused: "一時停止中", buffering: "バッファリング中", ended: "動画が終了しました", blocked: "再生操作が必要です", error: "再生できません" };
type Props = { compact?: boolean; video: CameraVideo; onPlaybackChange?(videoId: string, status: PlaybackStatus): void };

export function CameraPlayer({ video, onPlaybackChange, compact = false }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [showControls, setShowControls] = useState(false);
  // 動画IDでkeyを変えず、再試行・操作バー設定の変更時だけプレーヤー自体を作り直す。
  return <YouTubeEmbed compact={compact} key={`${attempt}:${showControls}`} showControls={showControls} onToggleControls={() => { onPlaybackChange?.(video.youtubeVideoId, "loading"); setShowControls(value => !value); }} video={video} onPlaybackChange={onPlaybackChange} onRetry={() => { onPlaybackChange?.(video.youtubeVideoId, "loading"); setAttempt(value => value + 1); }} />;
}

function YouTubeEmbed({ video, onPlaybackChange, onRetry, showControls, onToggleControls, compact }: Props & { onRetry(): void; showControls: boolean; onToggleControls(): void }) {
  const host = useRef<HTMLDivElement>(null);
  const initialControls = useRef(showControls);
  const player = useRef<YouTubePlayer | null>(null);
  const [presentedId, setPresentedId] = useState(video.youtubeVideoId);
  const transitioning = presentedId !== video.youtubeVideoId;
  const desired = useRef({ video, onPlaybackChange, canPlay: !transitioning });
  const prepareTransition = useRef<(() => void) | null>(null);
  const load = useRef<(() => void) | null>(null);
  const [result, setResult] = useState<{ videoId: string; status: PlaybackStatus; error: string }>({ videoId: video.youtubeVideoId, status: "loading", error: "" });
  const status = result.videoId === video.youtubeVideoId ? result.status : "loading";

  useLayoutEffect(() => {
    desired.current = { video, onPlaybackChange, canPlay: !transitioning };
    if (transitioning) prepareTransition.current?.();
    const iframe = host.current?.querySelector("iframe");
    if (iframe) iframe.title = `${video.title}（YouTubeプレーヤー）`;
  }, [video, onPlaybackChange, transitioning]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let ready = false;
    let requested = "";
    let animationFrame: number | undefined;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    const report = (state: PlaybackStatus, error = "") => {
      if (cancelled) return;
      const id = desired.current.video.youtubeVideoId;
      if (state === "error") setPresentedId(id);
      setResult({ videoId: id, status: state, error });
      desired.current.onPlaybackChange?.(id, state);
    };
    const watchStartup = () => {
      clearTimeout(startupTimer);
      startupTimer = setTimeout(() => report("error", "再生が始まりませんでした。再試行するか、別の景色を選んでください。"), 20000);
    };
    prepareTransition.current = () => {
      clearTimeout(startupTimer);
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      if (ready) player.current?.pauseVideo();
    };
    load.current = () => {
      if (!ready || !player.current || cancelled || !desired.current.canPlay) return;
      const id = desired.current.video.youtubeVideoId;
      if (requested === id && player.current.getVideoData().video_id === id) {
        watchStartup();
        player.current.playVideo();
        return;
      }
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        if (cancelled || !desired.current.canPlay || desired.current.video.youtubeVideoId !== id) return;
        requested = id;
        watchStartup();
        player.current?.loadVideoById(id);
      });
    };
    const iframe = document.createElement("iframe");
    iframe.title = `${desired.current.video.title}（YouTubeプレーヤー）`;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.src = buildYouTubeEmbedUrl(desired.current.video.youtubeVideoId, window.location.origin, initialControls.current);
    container.replaceChildren(iframe);

    void loadYouTubeAPI().then(api => {
      if (cancelled) return;
      watchStartup();
      player.current = new api.Player(iframe, {
        events: {
          onReady(event) {
            if (cancelled) return;
            ready = true;
            // 初回のみミュート。切替後も利用者が選んだ音量を維持する。
            event.target.mute();
            load.current?.();
          },
          onStateChange(event) {
            if (cancelled || event.target.getVideoData().video_id !== desired.current.video.youtubeVideoId) return;
            const states: Record<number, PlaybackStatus> = { [-1]: "loading", 0: "ended", 1: "playing", 2: "paused", 3: "buffering", 5: "ready" };
            const state = states[event.data];
            if (!state) return;
            if (state === "playing" || state === "paused" || state === "ended") clearTimeout(startupTimer);
            report(state);
          },
          onError(event) {
            if (cancelled) return;
            // 切替直後に残っていた旧動画のイベントを新動画へ適用しない。
            const id = event.target.getVideoData().video_id;
            if (id && id !== desired.current.video.youtubeVideoId) return;
            clearTimeout(startupTimer);
            report("error", youtubePlayerError(event.data));
          },
          onAutoplayBlocked() { clearTimeout(startupTimer); report("blocked"); },
        },
      });
    }).catch(() => {
      clearTimeout(startupTimer);
      report("error", "YouTubeプレーヤーを読み込めませんでした。通信状況を確認して再試行してください。");
    });

    return () => {
      cancelled = true;
      clearTimeout(startupTimer);
      load.current = null;
      prepareTransition.current = null;
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      player.current?.destroy();
      player.current = null;
      container.replaceChildren();
    };
  }, []);

  useEffect(() => {
    if (!transitioning) { load.current?.(); return; }
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
    const timer = setTimeout(() => setPresentedId(video.youtubeVideoId), duration);
    return () => clearTimeout(timer);
  }, [video.youtubeVideoId, transitioning]);

  return (
    <div className={`camera-player${compact ? " compact-player" : ""}`}>
      <section className="player player-live" aria-label={`${video.title}のプレーヤー領域`} data-playback-status={status}>
        <div className="youtube-host" ref={host} hidden={transitioning} />
        {transitioning && <div className="scene-title-card" key={video.youtubeVideoId} role="status"><span>NEXT SCENERY</span><h2>{video.title}</h2></div>}
      </section>
      <div className="player-caption"><span role="status"><span className="status-dot" /> {labels[status]}</span><a href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`} target="_blank" rel="noopener noreferrer">YouTubeで開く ↗</a></div>
      {status === "error" && <div className="player-error" role="alert"><h2>この動画を再生できません</h2><p>{result.error}</p><div><button type="button" onClick={onRetry}>再試行</button><a href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`} target="_blank" rel="noopener noreferrer">YouTubeで開く ↗</a></div></div>}
      <div className="player-display-controls"><button type="button" aria-pressed={showControls} onClick={onToggleControls}>{showControls ? "操作バーを非表示" : "操作バーを表示"}</button><span>表示を切り替えると、動画をミュートで読み込み直します。</span></div>
      {status === "blocked" ? <p className="playback-note playback-action">自動再生が制限されています。<button type="button" onClick={() => player.current?.playVideo()}>再生する</button>、または映像内の再生ボタンを押してください。</p> : <p className="playback-note">最初はミュートで再生します。「操作バーを表示」で音声・画質・全画面を操作できます。</p>}
    </div>
  );
}
