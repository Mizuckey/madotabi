import type { Metadata } from "next";
import Link from "next/link";
import { AdminConsole } from "@/components/admin/AdminConsole";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "カメラ管理 | 窓旅",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/" className="brand">窓旅<span className="admin-wordmark">管理</span></Link>
        <Link href="/" className="admin-back">風景の画面へ <span aria-hidden="true">↗</span></Link>
      </header>
      <main className="admin-main">
        <div className="admin-heading"><p className="eyebrow">CAMERA LIBRARY</p><h1>気になる景色を、ストック。</h1><p>YouTubeのURLを保存して、あとからゆっくり整えましょう。</p></div>
        {url && key ? <AdminConsole supabaseUrl={url} publishableKey={key} /> : (
          <section className="admin-card"><h2>管理画面の準備中です</h2><p>接続設定を確認してから、もう一度お試しください。</p></section>
        )}
      </main>
      <footer className="admin-footer"><span>窓旅 / CAMERA LIBRARY</span><span>保存したURLは、自動で公開されません。</span></footer>
    </div>
  );
}
