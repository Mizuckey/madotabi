import type { CameraLocation } from "./location";

/** 視聴に必要な公開情報。所在地は未登録でも再生できる。 */
export type CameraVideo = {
  id: string;
  title: string;
  youtubeVideoId: string;
  location?: CameraLocation | null;
};
