import type { LiveCamera } from "@/types/camera";

export function CameraPlayer({ camera }: { camera: LiveCamera }) {
  return (
    <section className="player" aria-label={`${camera.title}のプレーヤー領域`}>
      <div className="player-status"><span className="status-dot" /> プレーヤー未接続</div>
      <span className="player-ratio">16 : 9</span>
      <div className="player-placeholder">
        <svg width="52" height="40" viewBox="0 0 52 40" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="50" height="38" rx="7" stroke="currentColor" strokeWidth="1.3" />
          <path d="m22 13 12 7-12 7V13Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        <h2>ここから、景色がはじまる。</h2>
        <p>YouTube ライブカメラの表示エリア</p>
        <span className="placeholder-note">動画IDを登録すると、今後ここに映像を表示します</span>
      </div>
      <div className="player-bottom"><span>SORAMIRU / CAMERA VIEW</span><span>映像はまだ接続されていません</span></div>
    </section>
  );
}
