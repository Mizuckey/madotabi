import { Header } from "@/components/layout/Header";
import { CameraPlayer } from "@/components/player/CameraPlayer";
import { CameraInfo } from "@/components/camera/CameraInfo";
import { CameraMap } from "@/components/map/CameraMap";
import { WeatherInfo } from "@/components/weather/WeatherInfo";
import { cameras } from "@/data/cameras";

export default function Home() {
  const camera = cameras[0];

  return (
    <div className="app-shell">
      <Header />
      <main>
        <div className="page-heading"><div><p className="eyebrow">A WINDOW TO JAPAN</p><h1>いつもの時間に、ちがう景色を。</h1></div><span className="outline-label">画面プレビュー / 外部サービス未接続</span></div>
        <div className="view-layout">
          <div className="view-main">
            {camera ? <CameraPlayer camera={camera} /> : <section className="player empty-player"><h2>カメラが登録されていません</h2></section>}
            <section className="playback-controls" aria-labelledby="controls-title">
              <div className="control-description"><h2 id="controls-title">再生コントロール</h2><p>各地の景色を、ゆっくりと。</p></div>
              <div className="transport" aria-label="再生切替（すべて未実装）">
                <button disabled className="transport-button" aria-label="前のカメラ（未実装）">|◀</button>
                <button disabled className="play-button" aria-label="自動切替の再開（未実装）">▶</button>
                <button disabled className="transport-button" aria-label="次のカメラ（未実装）">▶|</button>
              </div>
              <div className="control-options"><button disabled className="option-button">全国ランダム</button><button disabled className="option-button">切替間隔 —</button></div>
            </section>
            <p className="development-note"><span className="status-dot" />開発用プレビュー：再生・切替操作は今後実装予定です。</p>
          </div>
          <aside className="side-panel" aria-label="カメラ詳細">
            {camera ? <><CameraInfo camera={camera} /><CameraMap camera={camera} /></> : <p className="panel-section">地点情報はありません。</p>}
            <WeatherInfo />
            <div className="panel-footer">風景を眺める、余白の時間。</div>
          </aside>
        </div>
      </main>
      <footer className="app-footer"><span>SORAMIRU</span><p>日本のどこかと、つながる窓。</p><span>MVP / 0.1</span></footer>
    </div>
  );
}
