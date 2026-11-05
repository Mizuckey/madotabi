import type { Metadata } from "next";
import Link from "next/link";
import { AdminConsole } from "@/components/admin/AdminConsole";
import "../admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "連続視聴 | 窓旅", robots: { index: false, follow: false } };

export default function PrivateWatchPage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return <div className="admin-shell private-watch-shell"><header className="admin-header"><Link href="/" className="brand">窓旅<span className="admin-wordmark">連続視聴</span></Link><Link href="/admin" className="admin-back">動画の管理へ →</Link></header><main className="admin-main"><div className="admin-heading"><p className="eyebrow">YOUR WINDOW TOUR</p><h1>登録した景色を、順番に。</h1><p>お気に入りの動画を、公開せずに流し続けられます。</p></div>{url && key ? <AdminConsole supabaseUrl={url} publishableKey={key} view="watch" /> : <section className="admin-card"><h2>連続視聴の準備中です</h2><p>接続設定を確認してから再度お試しください。</p></section>}</main><footer className="admin-footer"><span>窓旅 / PRIVATE TOUR</span><span>管理者だけの連続視聴</span></footer></div>;
}
