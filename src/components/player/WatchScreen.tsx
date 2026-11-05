"use client";

import Link from "next/link";
import type { CameraVideo } from "@/types/video";
import { CameraPlayer } from "./CameraPlayer";
import { CameraInfo } from "@/components/camera/CameraInfo";
import { CameraMap } from "@/components/map/CameraMap";
import { WeatherInfo } from "@/components/weather/WeatherInfo";
import { useCameraRotation } from "@/hooks/useCameraRotation";
import { ROTATION_INTERVALS } from "@/lib/rotation";

type Props = { videos: CameraVideo[]; loadError?: boolean; singleVideo?: boolean; initialVideoId?: string };

export function WatchScreen({ videos, loadError = false, singleVideo = false, initialVideoId }: Props) {
  if (!videos.length) return (
    <section className="catalog-empty">
      <p className="eyebrow">CAMERA VIEW</p><h2>{loadError ? "動画の一覧を取得できませんでした" : "登録されている動画はまだありません"}</h2>
      <p>{loadError ? "通信状況を確認して、もう一度お試しください。" : "「URLを追加」で動画を保存すると、ここで連続視聴できます。"}</p>
      <div>{loadError && <button type="button" onClick={() => window.location.reload()}>再読み込み</button>}<Link href="/?view=add">URLを追加する →</Link></div>
    </section>
  );

  return <PlaylistScreen key={JSON.stringify(videos.map(video => video.id))} videos={videos} singleVideo={singleVideo} initialVideoId={initialVideoId} />;
}

function PlaylistScreen({ videos, singleVideo, initialVideoId }: Required<Pick<Props, "videos" | "singleVideo">> & Pick<Props, "initialVideoId">) {
  const rotation = useCameraRotation(videos.length, Math.max(0, videos.findIndex(video => video.youtubeVideoId === initialVideoId)));
  const video = videos[rotation.index];
  const collectionName = "登録動画";

  return (
    <div className="view-layout" data-selected-video={video.youtubeVideoId}>
      <div className="view-main">
        <CameraPlayer video={video} />
        <section className="playback-controls active-controls" aria-labelledby="controls-title">
          <div className="control-description"><h2 id="controls-title">{singleVideo ? "動画単体の視聴" : "カメラを選ぶ"}</h2><p>{singleVideo ? "このURLから動画を確認できます" : `${rotation.index + 1} / ${videos.length} 件`}</p></div>
          {!singleVideo && <><div className="transport"><button type="button" className="watch-control" onClick={() => rotation.move(-1)} disabled={videos.length < 2} aria-label="前のカメラ">← 前へ</button><button type="button" className="watch-control" onClick={() => rotation.move(1)} disabled={videos.length < 2} aria-label="次のカメラ">次へ →</button></div><label className="video-select-label" htmlFor="video-select"><span className="sr-only">視聴するカメラ</span><select id="video-select" value={video.id} onChange={e => rotation.select(videos.findIndex(item => item.id === e.target.value))}>{videos.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></>}
          {singleVideo && <div className="single-video-links"><Link className="watch-home-link" href="/">登録動画を連続視聴 →</Link></div>}
        </section>
        {!singleVideo && <section className="rotation-controls" aria-label="自動切替設定" data-rotation-active={rotation.automatic}>
          <div className="rotation-status"><span className={`rotation-indicator${rotation.automatic ? " is-active" : ""}`} /><div><h2>{videos.length < 2 ? "動画が2件以上で自動切替できます" : rotation.automatic ? "自動で景色を切り替えています" : "自動切替を一時停止中"}</h2><p aria-live="off">{videos.length < 2 ? "今の動画をそのまま再生します" : rotation.automatic ? <>次の景色まで <span className="rotation-countdown">{rotation.remainingSeconds}</span> 秒</> : `再開まで残り ${rotation.remainingSeconds} 秒を保持`}</p></div></div>
          <div className="rotation-actions"><label htmlFor="rotation-interval">切替間隔<select id="rotation-interval" value={rotation.intervalSeconds} disabled={videos.length < 2} onChange={e => rotation.changeInterval(Number(e.target.value))}>{ROTATION_INTERVALS.map(seconds => <option key={seconds} value={seconds}>{seconds}秒</option>)}</select></label><button className="watch-control" type="button" disabled={videos.length < 2} aria-pressed={rotation.automatic} onClick={rotation.toggleAutomatic}>{rotation.automatic ? "自動切替を停止" : "自動切替を再開"}</button></div>
        </section>}
        <p className="development-note">{singleVideo ? "連続視聴では複数の景色を自動で切り替えられます。" : "自動切替の停止中も映像は再生されます。手動で選ぶと切替時間をリセットします。"} 配信状況はYouTube側で変わる場合があります。</p>
      </div>
      <aside className="side-panel" aria-label="カメラ詳細">
        <CameraInfo video={video} />
        {!singleVideo && <section className="panel-section"><div className="section-top"><h2>{collectionName}</h2><span className="muted-label">{videos.length} 件</span></div><ul className="camera-selector">{videos.map((item, index) => <li key={item.id}><button type="button" aria-pressed={item.id === video.id} onClick={() => rotation.select(index)}>{item.title}<span aria-hidden="true">↗</span></button></li>)}</ul></section>}
        <CameraMap /><WeatherInfo />
        <div className="panel-footer">風景を眺める、余白の時間。</div>
      </aside>
    </div>
  );
}
