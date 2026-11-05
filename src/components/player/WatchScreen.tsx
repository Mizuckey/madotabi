"use client";

import Link from "next/link";
import { useState } from "react";
import type { CameraVideo } from "@/types/video";
import { CameraPlayer } from "./CameraPlayer";
import { CameraInfo } from "@/components/camera/CameraInfo";
import { CameraMap } from "@/components/map/CameraMap";
import { WeatherInfo } from "@/components/weather/WeatherInfo";

export function WatchScreen({ videos, loadError = false, singleVideo = false }: { videos: CameraVideo[]; loadError?: boolean; singleVideo?: boolean }) {
  const [selectedId, setSelectedId] = useState(videos[0]?.id ?? "");
  const video = videos.find(item => item.id === selectedId) ?? videos[0];
  const index = video ? videos.findIndex(item => item.id === video.id) : -1;

  function move(direction: number) {
    if (videos.length < 2) return;
    setSelectedId(videos[(index + direction + videos.length) % videos.length].id);
  }

  if (!video) return (
    <section className="catalog-empty">
      <p className="eyebrow">CAMERA VIEW</p><h2>{loadError ? "動画の一覧を取得できませんでした" : "公開されている動画はまだありません"}</h2>
      <p>{loadError ? "通信状況を確認して、もう一度お試しください。" : "管理画面で動画をプレビューし、「トップに公開」を選ぶと、ここから視聴できます。"}</p>
      <div>{loadError && <button type="button" onClick={() => window.location.reload()}>再読み込み</button>}<Link href="/admin">管理画面へ →</Link></div>
    </section>
  );

  return (
    <div className="view-layout">
      <div className="view-main">
        <CameraPlayer video={video} />
        <section className="playback-controls active-controls" aria-labelledby="controls-title">
          <div className="control-description"><h2 id="controls-title">{singleVideo ? "動画単体の視聴" : "カメラを選ぶ"}</h2><p>{singleVideo ? "このURLから動画を確認できます" : `${index + 1} / ${videos.length} 件`}</p></div>
          {!singleVideo && <><div className="transport"><button type="button" className="watch-control" onClick={() => move(-1)} disabled={videos.length < 2} aria-label="前のカメラ">← 前へ</button><button type="button" className="watch-control" onClick={() => move(1)} disabled={videos.length < 2} aria-label="次のカメラ">次へ →</button></div><label className="video-select-label" htmlFor="video-select"><span className="sr-only">視聴するカメラ</span><select id="video-select" value={video.id} onChange={e => setSelectedId(e.target.value)}>{videos.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></>}
          {singleVideo && <Link className="watch-home-link" href="/">公開カメラ一覧へ →</Link>}
        </section>
        <p className="development-note">配信のライブ状態や公開状況はYouTube側で変わる場合があります。自動切替は今後追加します。</p>
      </div>
      <aside className="side-panel" aria-label="カメラ詳細">
        <CameraInfo video={video} />
        {!singleVideo && <section className="panel-section"><div className="section-top"><h2>公開カメラ</h2><span className="muted-label">{videos.length} 件</span></div><ul className="camera-selector">{videos.map(item => <li key={item.id}><button type="button" aria-pressed={item.id === video.id} onClick={() => setSelectedId(item.id)}>{item.title}<span aria-hidden="true">↗</span></button></li>)}</ul></section>}
        <CameraMap />
        <WeatherInfo />
        <div className="panel-footer">風景を眺める、余白の時間。</div>
      </aside>
    </div>
  );
}
