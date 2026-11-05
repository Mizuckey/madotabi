import type { CameraVideo } from "@/types/video";

export function CameraInfo({ video }: { video: CameraVideo }) {
  return (
    <section className="panel-section camera-info" aria-labelledby="camera-info-title">
      <div className="section-top"><h2 id="camera-info-title">視聴中の動画</h2><span className="sample-badge">YouTube</span></div>
      <h3>{video.title}</h3>
      <p className="location">所在地の詳細は未登録です</p>
      <p className="video-id">動画ID / {video.youtubeVideoId}</p>
    </section>
  );
}
