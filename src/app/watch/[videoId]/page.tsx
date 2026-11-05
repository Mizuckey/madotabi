import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { WatchScreen } from "@/components/player/WatchScreen";

export const metadata: Metadata = { title: "動画を視聴 | SORAMIRU", robots: { index: false, follow: false } };

/** 入力された公開YouTube IDを再生する。非公開の登録候補やメモは取得しない。 */
export default async function WatchPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) notFound();
  return <div className="app-shell"><Header /><main><div className="page-heading"><div><p className="eyebrow">YOUTUBE VIEW</p><h1>動画を視聴</h1></div><span className="outline-label">URL指定 / 公開一覧への追加は行いません</span></div><WatchScreen videos={[{ id: videoId, title: "YouTube動画", youtubeVideoId: videoId }]} singleVideo /></main><footer className="app-footer"><span>SORAMIRU</span><p>日々のそばに、日本の景色。</p></footer></div>;
}
