import type { LiveCamera } from "@/types/camera";

export function CameraInfo({ camera }: { camera: LiveCamera }) {
  return (
    <section className="panel-section camera-info" aria-labelledby="camera-info-title">
      <div className="section-top"><h2 id="camera-info-title">カメラ情報</h2><span className="sample-badge">サンプル地点</span></div>
      <p className="eyebrow">{camera.prefectureName} / {camera.locationName.split(" ")[0]}</p>
      <h3>{camera.title}</h3>
      <p className="location">{camera.locationName}</p>
      <div className="camera-meta"><span className="category">{camera.category}</span><span>配信未登録</span></div>
    </section>
  );
}
