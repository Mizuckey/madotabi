"use client";

import Link from "next/link";
import { useCallback } from "react";
import type { PlaybackStatus } from "@/lib/youtube-player";
import type { CameraVideo } from "@/types/video";
import { CameraPlayer } from "./CameraPlayer";
import { InfoTicker } from "./InfoTicker";
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
  const reportPlayback = useCallback((videoId: string, status: PlaybackStatus) => {
    if (videoId === video.youtubeVideoId) rotation.onPlaybackChange(status);
  }, [video.youtubeVideoId, rotation.onPlaybackChange]);

  return (
    <div className="watch-screen" data-selected-video={video.youtubeVideoId}>
      <CameraPlayer video={video} onPlaybackChange={reportPlayback} compact />
      <InfoTicker key={video.id} title={video.title} />
      <section className="watch-toolbar" aria-label="再生切替" data-rotation-active={rotation.automatic}>
        {!singleVideo ? <>
          <div className="transport"><button type="button" className="watch-control" onClick={() => rotation.move(-1)} disabled={videos.length < 2} aria-label="前のカメラ">←</button><button type="button" className="watch-control" onClick={() => rotation.move(1)} disabled={videos.length < 2} aria-label="次のカメラ">→</button></div>
          <label className="watch-video-choice" htmlFor="video-select"><span className="sr-only">視聴するカメラ</span><select id="video-select" value={video.id} onChange={e => rotation.select(videos.findIndex(item => item.id === e.target.value))}>{videos.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="watch-interval" htmlFor="rotation-interval"><span>切替</span><select id="rotation-interval" value={rotation.intervalSeconds} disabled={videos.length < 2} onChange={e => rotation.changeInterval(Number(e.target.value))}>{ROTATION_INTERVALS.map(seconds => <option key={seconds} value={seconds}>{seconds}秒</option>)}</select></label>
          <button className="watch-control rotation-toggle" type="button" disabled={videos.length < 2} aria-pressed={rotation.automatic} onClick={rotation.toggleAutomatic}>{rotation.automatic ? "自動切替を停止" : "自動切替を再開"}</button>
          <p className="watch-countdown" aria-live="off">{videos.length < 2 ? "1件を再生" : rotation.counting ? <>次まで <span className="rotation-countdown">{rotation.remainingSeconds}</span> 秒</> : rotation.automatic ? `再生待ち · 残り${rotation.remainingSeconds}秒` : `停止中 · 残り${rotation.remainingSeconds}秒`}</p>
        </> : <Link className="watch-home-link" href="/">登録動画を連続視聴 →</Link>}
      </section>
    </div>
  );
}
