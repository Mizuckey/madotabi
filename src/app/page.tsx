import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { AdminConsole } from "@/components/admin/AdminConsole";
import "./admin/admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "窓旅", robots: { index: false, follow: false } };

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return <div className="app-shell personal-shell"><Header /><main className="personal-main">
    {url && key ? <AdminConsole key={view === "add" ? "add" : "watch"} supabaseUrl={url} publishableKey={key} initialView={view === "add" ? "add" : "watch"} /> : <section className="admin-card"><h1>接続の準備中です</h1><p>しばらくしてから、もう一度お試しください。</p></section>}
  </main><footer className="app-footer"><span>窓旅</span><p>好きな景色を、日々のそばに。</p></footer></div>;
}
