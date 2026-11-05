export interface YouTubePlayer {
  mute(): void;
  playVideo(): void;
  destroy(): void;
}
type PlayerEvent = { target: YouTubePlayer };
export type YouTubeAPI = {
  Player: new (element: HTMLElement, options: {
    events: {
      onReady(event: PlayerEvent): void;
      onStateChange(event: PlayerEvent & { data: number }): void;
      onError(event: PlayerEvent & { data: number }): void;
      onAutoplayBlocked(event: PlayerEvent): void;
    };
  }) => YouTubePlayer;
};
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeAPI> | undefined;

/** 同時に複数のプレーヤーがマウントされてもAPIスクリプトは共有する。 */
export function loadYouTubeAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  const pending = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      window.onYouTubeIframeAPIReady = previous;
      if (error) { script.remove(); reject(error); }
      else if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube API unavailable"));
    };
    const timeout = setTimeout(() => finish(new Error("YouTube API timeout")), 15000);
    window.onYouTubeIframeAPIReady = () => {
      try { previous?.(); } finally { finish(); }
    };
    script.addEventListener("error", () => finish(new Error("YouTube API load failed")), { once: true });
    document.head.append(script);
  });
  apiPromise = pending;
  void pending.catch(() => { if (apiPromise === pending) apiPromise = undefined; });
  return pending;
}

export function buildYouTubeEmbedUrl(videoId: string, origin: string): string {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error("Invalid video ID");
  const site = new URL(origin);
  if (!["https:", "http:"].includes(site.protocol) || site.origin !== origin) throw new Error("Invalid origin");
  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.search = new URLSearchParams({ enablejsapi: "1", origin, autoplay: "0", controls: "1", playsinline: "1", rel: "0" }).toString();
  return url.toString();
}

export function youtubePlayerError(code: number): string {
  switch (code) {
    case 2: return "動画IDを確認してください。";
    case 5: return "このブラウザで動画を再生できません。再試行するか、YouTubeで開いてください。";
    case 100: return "動画が削除・非公開になっている可能性があります。YouTubeで配信状況をご確認ください。";
    case 101:
    case 150: return "配信者が外部サイトでの埋め込み再生を許可していません。YouTubeでご視聴ください。";
    case 153: return "YouTubeがこのサイトの再生元を確認できませんでした。ブラウザ設定を確認するか、YouTubeで開いてください。";
    default: return "動画を再生できませんでした。再試行するか、YouTubeで配信状況をご確認ください。";
  }
}
