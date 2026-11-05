"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { CameraVideo } from "@/types/video";
import { WatchScreen } from "@/components/player/WatchScreen";

type Row = { id: string; title: string; youtube_video_id: string };

/** AdminConsoleの権限確認後にだけマウント。RLS付きの候補一覧を本人のセッションで読む。 */
export function PrivateWatch({ supabase }: { supabase: SupabaseClient }) {
  const [result, setResult] = useState<{ videos: CameraVideo[]; error: boolean } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const rows: Row[] = [];
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabase.from("camera_submissions").select("id,title,youtube_video_id").order("created_at", { ascending: false }).order("id").range(offset, offset + 99).abortSignal(controller.signal).returns<Row[]>();
        if (controller.signal.aborted) return;
        if (error) throw new Error("Private collection unavailable");
        rows.push(...(data ?? []));
        if (!data || data.length < 100) break;
      }
      if (!controller.signal.aborted) setResult({ videos: [...new Map(rows.map(row => [row.id, row])).values()].map(row => ({ id: row.id, title: row.title || `YouTube動画 ${row.youtube_video_id}`, youtubeVideoId: row.youtube_video_id })), error: false });
    }
    void load().catch(() => { if (!controller.signal.aborted) setResult({ videos: [], error: true }); });
    return () => controller.abort();
  }, [supabase]);

  if (!result) return <section className="admin-card" role="status">登録動画を読み込んでいます…</section>;
  return <><p className="private-watch-note">管理者専用：未公開の登録候補も含みます。この視聴で動画が公開されることはありません。</p><WatchScreen videos={result.videos} loadError={result.error} privateCollection /></>;
}
