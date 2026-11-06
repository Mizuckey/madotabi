"use client";

import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import type { PlaybackStatus } from "@/lib/youtube-player";
import type { CameraVideo } from "@/types/video";
import { CameraPlayer } from "./CameraPlayer";
import { InfoTicker } from "./InfoTicker";
import { useCameraRotation } from "@/hooks/useCameraRotation";
import { ROTATION_INTERVALS } from "@/lib/rotation";
import { useDaylight } from "@/hooks/useDaylight";
import { canPlayScenery } from "@/lib/daylight";

type Props = { videos: CameraVideo[]; loadError?: boolean; singleVideo?: boolean; initialVideoId?: string; informationVideos?: CameraVideo[]; notification?: ReactNode };

export function WatchScreen({ videos, loadError = false, singleVideo = false, initialVideoId, informationVideos, notification }: Props) {
  const daylight = useDaylight(singleVideo ? [] : videos);
  const eligibleIndices = videos.flatMap((video, index) => singleVideo || canPlayScenery(video, daylight.readings, daylight.now) ? [index] : []);
  if (!videos.length) return (
    <div className="watch-screen"><section className="catalog-empty">
      <p className="eyebrow">CAMERA VIEW</p><h2>{loadError ? "動画の一覧を取得できませんでした" : "登録されている動画はまだありません"}</h2>
      <p>{loadError ? "通信状況を確認して、もう一度お試しください。" : "「景色リスト」で動画を保存すると、ここで連続視聴できます。"}</p>
      <div>{loadError && <button type="button" onClick={() => window.location.reload()}>再読み込み</button>}<Link href="/?view=add">景色リストを開く →</Link></div>
    </section>{notification && <div className="empty-live-notice">{notification}</div>}</div>
  );

  if (!eligibleIndices.length) return <div className="watch-screen"><section className="catalog-empty"><h2>現在、連続再生できる景色がありません</h2><p>夜景OFFの景色は、登録地点の日の出から日の入りまで再生します。地点未登録・日照時刻の取得中や取得失敗も対象外です。</p><p>日中になれば自動で再開します。日没後も流したい景色は「夜景ON」にしてください。</p><Link className="watch-home-link" href="/?view=add">景色リストで設定する →</Link></section>{notification && <div className="empty-live-notice">{notification}</div>}<InfoTicker videos={informationVideos ?? videos} /></div>;
  return <PlaylistScreen key={JSON.stringify(videos.map(video => video.id))} videos={videos} eligibleIndices={eligibleIndices} singleVideo={singleVideo} initialVideoId={initialVideoId} informationVideos={informationVideos} notification={notification} />;
}

function PlaylistScreen({ videos, eligibleIndices, singleVideo, initialVideoId, informationVideos, notification }: Required<Pick<Props, "videos" | "singleVideo">> & Pick<Props, "initialVideoId" | "informationVideos" | "notification"> & { eligibleIndices: number[] }) {
  const rotation = useCameraRotation(videos.length, Math.max(0, videos.findIndex(video => video.youtubeVideoId === initialVideoId)), eligibleIndices);
  const video = videos[rotation.index];
  const onPlaybackChange = rotation.onPlaybackChange;
  const reportPlayback = useCallback((videoId: string, status: PlaybackStatus) => {
    if (videoId === video.youtubeVideoId) onPlaybackChange(status);
  }, [video.youtubeVideoId, onPlaybackChange]);

  return (
    <div className="watch-screen" data-selected-video={video.youtubeVideoId}>
      <CameraPlayer video={video} onPlaybackChange={reportPlayback} notification={notification} compact />
      <InfoTicker videos={informationVideos ?? videos} />
      <section className="watch-toolbar" aria-label="再生切替" data-rotation-active={rotation.automatic}>
        {!singleVideo ? <>
          <div className="transport"><button type="button" className="watch-control" onClick={() => rotation.move(-1)} disabled={eligibleIndices.length < 2} aria-label="前のカメラ">←</button><button type="button" className="watch-control" onClick={() => rotation.move(1)} disabled={eligibleIndices.length < 2} aria-label="次のカメラ">→</button></div>
          <label className="watch-video-choice" htmlFor="video-select"><span className="sr-only">視聴するカメラ</span><select id="video-select" value={video.id} onChange={e => rotation.select(videos.findIndex(item => item.id === e.target.value))}>{eligibleIndices.map(index => videos[index]).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="watch-interval" htmlFor="rotation-interval"><span>切替</span><select id="rotation-interval" value={rotation.intervalSeconds} disabled={eligibleIndices.length < 2} onChange={e => rotation.changeInterval(Number(e.target.value))}>{ROTATION_INTERVALS.map(seconds => <option key={seconds} value={seconds}>{seconds}秒</option>)}</select></label>
          <button className="watch-control rotation-toggle" type="button" disabled={eligibleIndices.length < 2} aria-pressed={rotation.automatic} onClick={rotation.toggleAutomatic}>{rotation.automatic ? "自動切替を停止" : "自動切替を再開"}</button>
        </> : <Link className="watch-home-link" href="/">登録動画を連続視聴 →</Link>}
      </section>
    </div>
  );
}
