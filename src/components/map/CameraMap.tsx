export function CameraMap() {
  return (
    <section className="panel-section" aria-labelledby="map-title">
      <div className="section-top"><h2 id="map-title">カメラの場所</h2><span className="muted-label">未登録</span></div>
      <div className="map-placeholder">
        <svg width="25" height="30" viewBox="0 0 25 30" fill="none" aria-hidden="true"><path d="M22 11c0 7-9.5 17-9.5 17S3 18 3 11a9.5 9.5 0 1 1 19 0Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12.5" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
        <p>位置情報はまだありません</p><span>所在地・地図表示は今後追加します</span>
      </div>
    </section>
  );
}
