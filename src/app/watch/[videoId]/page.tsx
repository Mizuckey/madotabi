import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { WatchScreen } from "@/components/player/WatchScreen";
import "../../admin/admin.css";

export const metadata: Metadata = { title: "動画を視聴 | 窓旅", robots: { index: false, follow: false } };

/** 入力された公開YouTube IDを再生する。非公開の登録候補やメモは取得しない。 */
export default async function WatchPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) notFound();
  return <div className="app-shell personal-shell"><Header /><main className="personal-main"><WatchScreen videos={[{ id: videoId, title: "YouTube動画", youtubeVideoId: videoId }]} singleVideo /></main></div>;
}
