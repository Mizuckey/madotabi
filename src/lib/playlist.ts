import type { CameraVideo } from "../types/video";

export function combinePlaylist(scenery: CameraVideo[], lives: CameraVideo[]): CameraVideo[] {
  const videos = new Map(scenery.map(video => [video.youtubeVideoId, video]));
  for (const live of lives) {
    if (!videos.has(live.youtubeVideoId)) {
      videos.set(live.youtubeVideoId, { ...live, channelLive: true });
    }
  }
  return [...videos.values()];
}
