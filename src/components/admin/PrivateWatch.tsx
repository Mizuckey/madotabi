"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CameraVideo } from "@/types/video";
import { locationFromRow } from "@/lib/location";
import type { LocationColumns } from "@/types/location";
import { WatchScreen } from "@/components/player/WatchScreen";
import { SceneryEditForm, type SceneryUpdate } from "./SceneryEditForm";

const fields = "id,title,youtube_video_id,location_name,latitude,longitude,night_view";
type Row = { id: string; title: string; youtube_video_id: string; night_view: boolean } & LocationColumns;

function toVideo(row: Row): CameraVideo {
  return {
    id: row.id,
    title: row.title || `YouTube動画 ${row.youtube_video_id}`,
    youtubeVideoId: row.youtube_video_id,
    location: locationFromRow(row),
    nightView: row.night_view,
  };
}

/** AdminConsoleの権限確認後にだけマウント。RLS付きの候補一覧を本人のセッションで読む。 */
export function PrivateWatch({ supabase, userId, initialVideoId, onVideoChange, liveVideo, notification, onReturn }: { supabase: SupabaseClient; userId: string; initialVideoId?: string; onVideoChange?(videoId: string): void; liveVideo?: CameraVideo | null; notification?: ReactNode; onReturn?(): void }) {
  const [result, setResult] = useState<{ videos: CameraVideo[]; error: boolean } | null>(null);

  const [editing, setEditing] = useState<CameraVideo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  function openEditor(video: CameraVideo) {
    setSaved(false);
    setEditing(video);
  }

  useEffect(() => {
    if (editing && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [editing]);

  async function saveEdit(id: string, update: SceneryUpdate) {
    setSaving(true);
    try {
      const { data, error } = await supabase.from("camera_submissions")
        .update(update).eq("id", id).eq("created_by", userId).is("deleted_at", null)
        .select(fields).single<Row>();
      if (error) throw error;
      setResult(current => current && {
        ...current,
        videos: current.videos.map(video => video.id === id ? toVideo(data) : video),
      });
      setSaved(true);
      dialog.current?.close();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const rows: Row[] = [];
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabase.from("camera_submissions").select(fields).eq("created_by", userId).is("deleted_at", null).order("position").order("id").range(offset, offset + 99).abortSignal(controller.signal).returns<Row[]>();
        if (controller.signal.aborted) return;
        if (error) throw new Error("Private collection unavailable");
        rows.push(...(data ?? []));
        if (!data || data.length < 100) break;
      }
      if (!controller.signal.aborted) setResult({ videos: [...new Map(rows.map(row => [row.id, row])).values()].map(toVideo), error: false });
    }
    void load().catch(() => { if (!controller.signal.aborted) setResult({ videos: [], error: true }); });
    return () => controller.abort();
  }, [supabase, userId]);

  if (liveVideo) return (
    <WatchScreen
      videos={[liveVideo]}
      informationVideos={result?.videos ?? []}
      notification={notification}
      singleVideo
      onReturnToPlaylist={onReturn}
    />
  );
  if (!result) return <section className="admin-card" role="status">登録動画を読み込んでいます…</section>;
  return <>
    <WatchScreen videos={result.videos} loadError={result.error} initialVideoId={initialVideoId}
      onVideoChange={onVideoChange} notification={notification} onEditVideo={openEditor} editing={!!editing} />
    {saved && <p className="sr-only" role="status">景色の変更を保存しました。</p>}
    <dialog className="scenery-edit-dialog" ref={dialog} aria-labelledby="current-scenery-edit-title"
      onCancel={event => { if (saving) event.preventDefault(); }} onClose={() => setEditing(null)}>
      <h2 id="current-scenery-edit-title">再生中の景色を編集</h2>
      {editing && <SceneryEditForm key={editing.id} video={editing} busy={saving}
        onSave={update => saveEdit(editing.id, update)} onCancel={() => dialog.current?.close()} />}
    </dialog>
  </>;
}
