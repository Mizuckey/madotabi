import type { CameraVideo } from "./video";

export type ChannelWatch = {
  id: string;
  channel_ref: string;
  channel_url: string;
  channel_title: string;
  channel_id: string | null;
  enabled: boolean;
  last_attempt_at: string | null;
  last_checked_at: string | null;
  last_error: boolean;
  live_videos: CameraVideo[];
};
export const CHANNEL_FIELDS = "id,channel_ref,channel_url,channel_title,channel_id,enabled,last_attempt_at,last_checked_at,last_error,live_videos";
