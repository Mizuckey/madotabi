import { Header } from "@/components/layout/Header";
import { WatchScreen } from "@/components/player/WatchScreen";
import type { CameraVideo } from "@/types/video";

export const dynamic = "force-dynamic";

async function loadVideos(): Promise<{ videos: CameraVideo[]; loadError: boolean }> {
  try {
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!base || !key) throw new Error("Missing configuration");
    const url = new URL("/rest/v1/camera_videos", base);
    url.search = new URLSearchParams({ select: "id,title,youtube_video_id", order: "published_at.desc,id.asc", limit: "100" }).toString();
    const response = await fetch(url, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Catalog request failed");
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error("Invalid catalog response");
    const videos = rows.map((row): CameraVideo => {
      if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.youtube_video_id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(row.youtube_video_id)) throw new Error("Invalid video record");
      return { id: row.id, title: row.title, youtubeVideoId: row.youtube_video_id };
    });
    return { videos, loadError: false };
  } catch { return { videos: [], loadError: true }; }
}

export default async function Home() {
  const { videos, loadError } = await loadVideos();
  return (
    <div className="app-shell">
      <Header />
      <main>
        <div className="page-heading"><div><p className="eyebrow">A WINDOW TO JAPAN</p><h1>いつもの時間に、ちがう景色を。</h1></div><span className="outline-label">{loadError ? "一覧の取得に失敗しました" : `公開カメラ ${videos.length} 件 / YouTube`}</span></div>
        <WatchScreen videos={videos} loadError={loadError} />
      </main>
      <footer className="app-footer"><span>SORAMIRU</span><p>日本のどこかと、つながる窓。</p><span>MVP / 0.2</span></footer>
    </div>
  );
}
