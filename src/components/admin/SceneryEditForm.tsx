"use client";

import { useId, useState, type FormEvent } from "react";
import { LocationPicker } from "@/components/camera/LocationPicker";
import { locationColumns } from "@/lib/location";
import { parseYouTubeUrl } from "@/lib/youtube";
import type { CameraVideo } from "@/types/video";
import type { LocationColumns } from "@/types/location";

export type SceneryUpdate = LocationColumns & {
  title: string;
  youtube_video_id: string;
  youtube_url: string;
  night_view: boolean;
};

export function SceneryEditForm({ video, busy, onSave, onCancel }: {
  video: CameraVideo;
  busy: boolean;
  onSave(update: SceneryUpdate): Promise<void>;
  onCancel(): void;
}) {
  const id = useId();
  const [title, setTitle] = useState(video.title);
  const [url, setUrl] = useState(`https://www.youtube.com/watch?v=${video.youtubeVideoId}`);
  const [location, setLocation] = useState(video.location ?? null);
  const [nightView, setNightView] = useState(video.nightView ?? false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const name = title.trim();
    const parsed = parseYouTubeUrl(url);
    if (!name || name.length > 100) {
      setError("タイトルを1〜100文字で入力してください。");
      return;
    }
    if (!parsed) {
      setError("YouTubeの動画URLを入力してください。");
      return;
    }
    setError("");
    try {
      await onSave({
        title: name,
        youtube_video_id: parsed.videoId,
        youtube_url: parsed.canonicalUrl,
        night_view: nightView,
        ...locationColumns(location),
      });
    } catch (failure) {
      const duplicate = failure && typeof failure === "object" && "code" in failure && failure.code === "23505";
      setError(duplicate
        ? "この動画は登録済みです。削除した景色も確認してください。"
        : "保存できませんでした。入力は残しています。通信状況を確認して再度お試しください。");
    }
  }

  return (
    <form className="admin-form scenery-edit-form" onSubmit={submit} aria-label="景色を編集">
      <label htmlFor={`${id}-title`}>タイトル</label>
      <input id={`${id}-title`} required value={title} maxLength={100} disabled={busy} onChange={event => setTitle(event.target.value)} />
      <label htmlFor={`${id}-url`}>YouTube URL</label>
      <input id={`${id}-url`} type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
        required value={url} maxLength={2048} disabled={busy} onChange={event => setUrl(event.target.value)} />
      <LocationPicker title={title} value={location} onChange={setLocation} disabled={busy} />
      <label className="night-view-option">
        <input type="checkbox" checked={nightView} disabled={busy} onChange={event => setNightView(event.target.checked)} />
        夜景ON（日没後も再生）
      </label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-video-actions">
        <button className="admin-primary" type="submit" disabled={busy}>{busy ? "保存中…" : "変更を保存"}</button>
        <button className="admin-secondary" type="button" disabled={busy} onClick={onCancel}>キャンセル</button>
      </div>
    </form>
  );
}
