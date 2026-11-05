"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";

type Submission = {
  id: string;
  youtube_video_id: string;
  youtube_url: string;
  title: string;
  notes: string;
  created_at: string;
};
const fields = "id,youtube_video_id,youtube_url,title,notes,created_at";
const pageSize = 20;

export function SubmissionManager({ supabase, userId, onWatch }: { supabase: SupabaseClient; userId: string; onWatch(videoId: string): void }) {
  const [items, setItems] = useState<Submission[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState("");
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const urlInput = useRef<HTMLInputElement>(null);
  const parsed = parseYouTubeUrl(url);

  const loadFirstPage = useCallback(async (signal?: AbortSignal) => {
    const query = supabase.from("camera_submissions").select(fields, { count: "exact" }).order("created_at", { ascending: false }).order("id").range(0, pageSize - 1);
    const { data, count, error } = await (signal ? query.abortSignal(signal) : query).returns<Submission[]>();
    if (signal?.aborted) return;
    if (error) setListError("一覧を取得できませんでした。通信状況とログイン状態を確認して再度お試しください。");
    else { setItems(data ?? []); setCount(count ?? 0); setListError(""); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const controller = new AbortController();
    void supabase.from("camera_submissions").select(fields, { count: "exact" }).order("created_at", { ascending: false }).order("id").range(0, pageSize - 1).abortSignal(controller.signal).returns<Submission[]>().then(({ data, count, error }) => {
      if (controller.signal.aborted) return;
      if (error) setListError("一覧を取得できませんでした。再度お試しください。");
      else { setItems(data ?? []); setCount(count ?? 0); setListError(""); }
      setLoading(false);
    }, () => {
      if (!controller.signal.aborted) { setListError("一覧を取得できませんでした。再度お試しください。"); setLoading(false); }
    });
    return () => controller.abort();
  }, [supabase]);

  async function reload() {
    setLoading(true);
    try { await loadFirstPage(); }
    catch { setListError("一覧を取得できませんでした。再度お試しください。"); setLoading(false); }
  }

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const { data, count, error } = await supabase.from("camera_submissions").select(fields, { count: "exact" }).order("created_at", { ascending: false }).order("id").range(items.length, items.length + pageSize - 1).returns<Submission[]>();
      if (error) { setListError("続きを取得できませんでした。再度お試しください。"); return; }
      setItems(current => [...current, ...(data ?? []).filter(item => !current.some(existing => existing.id === item.id))]);
      setCount(count ?? 0); setListError("");
    } catch { setListError("続きを取得できませんでした。再度お試しください。"); }
    finally { setLoadingMore(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading || loadingMore) return;
    setSaveError(""); setTouched(true);
    if (!parsed) { setSaveError("YouTubeの動画URLを入力してください。watch・youtu.be・live形式などに対応しています。"); urlInput.current?.focus(); return; }
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = String(values.get("title") ?? "").trim();
    const notes = String(values.get("notes") ?? "").trim();
    setSaving(true);
    try {
      const { error } = await supabase.from("camera_submissions").insert({ youtube_video_id: parsed.videoId, youtube_url: parsed.canonicalUrl, title, notes, created_by: userId });
      if (error) {
        setSaveError(error.code === "23505" ? "この動画はすでに保存されています。登録済み一覧をご確認ください。" : "保存できませんでした。入力内容・通信状況・ログイン状態を確認して再度お試しください。");
        return;
      }
      form.reset(); setUrl(""); setTouched(false);
      onWatch(parsed.videoId);
    } catch { setSaveError("接続できませんでした。入力内容はそのままで再度お試しください。"); }
    finally { setSaving(false); }
  }

  return (
    <div className="admin-workspace">
      <section className="admin-card admin-add-card" aria-labelledby="add-title">
        <div className="admin-card-heading"><span className="admin-step">01 / ADD A VIEW</span><h2 id="add-title">動画URLを追加</h2><p>まずはURLだけでOK。気づいたことはメモに残せます。</p></div>
        {saveError && <p className="admin-error" role="alert">{saveError}</p>}
        <form onSubmit={save} className="admin-form">
          <label htmlFor="camera-url">YouTube URL <span className="admin-required">必須</span></label>
          <input ref={urlInput} id="camera-url" name="url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://www.youtube.com/watch?v=…" required maxLength={2048} value={url} onChange={e => { setUrl(e.target.value); setSaveError(""); }} onBlur={() => setTouched(true)} disabled={saving} aria-invalid={touched && !!url && !parsed} aria-describedby="url-help" />
          <p className="admin-field-hint" id="url-help">{parsed ? `動画ID：${parsed.videoId} · URLの形式を確認しました` : touched && url ? "YouTubeの動画URLを確認してください。" : "通常の動画URL、短縮URL、/live/ 形式に対応。"}</p>
          <details className="personal-details"><summary>タイトル・メモを追加（任意）</summary><div className="admin-form">
          <label htmlFor="camera-title">タイトル <span className="admin-optional">任意</span></label>
          <input id="camera-title" name="title" type="text" maxLength={100} placeholder="例：海が見えるライブカメラ" disabled={saving} />
          <label htmlFor="camera-notes">メモ <span className="admin-optional">任意</span></label>
          <textarea id="camera-notes" name="notes" rows={3} maxLength={1000} placeholder="場所や気づいたことなど" disabled={saving} />
          </div></details>
          <button className="admin-primary" type="submit" disabled={saving || loading || loadingMore}>{saving ? "保存しています…" : "保存して見る"}<span aria-hidden="true"> ＋</span></button>
          <p className="admin-security-note">配信の実在・ライブ状態・埋め込み可否は未確認のまま保存されます。</p>
        </form>
      </section>
      <section className="admin-library" aria-labelledby="library-title">
        <div className="admin-library-header"><div><span className="admin-step">02 / YOUR COLLECTION</span><h2 id="library-title">登録した動画 <span className="admin-count">{loading ? "—" : count}</span></h2></div><button className="admin-secondary" type="button" onClick={reload} disabled={loading || loadingMore || saving}>更新</button></div>
        {listError && <div className="admin-error" role="alert">{listError} <button className="admin-text-button" onClick={reload} disabled={loading}>再取得</button></div>}
        {loading ? <div className="admin-card admin-empty" role="status">登録した動画を読み込んでいます…</div> : items.length === 0 && !listError ? (
          <div className="admin-card admin-empty"><span className="admin-empty-mark" aria-hidden="true">＋</span><h3>次に眺めたい景色を、ひとつ。</h3><p>保存したYouTube URLがここに並びます。<br />スマホで見つけたときにも、そのまま追加できます。</p></div>
        ) : (
          <ul className="admin-items">{items.map(item => (
            <li key={item.id} className="admin-item"><div className="admin-item-top"><span className="admin-item-label">登録した動画</span><time dateTime={item.created_at}>{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.created_at))}</time></div><h3>{item.title || "タイトル未設定"}</h3><a className="admin-video-link" href={item.youtube_url} target="_blank" rel="noopener noreferrer">{item.youtube_url}<span aria-hidden="true"> ↗</span></a>{item.notes && <p className="admin-item-notes">{item.notes}</p>}
              <div className="admin-video-actions"><button className="admin-secondary" type="button" onClick={() => onWatch(item.youtube_video_id)}>この景色を見る →</button></div>
            </li>
          ))}</ul>
        )}
        {!loading && items.length > 0 && items.length < count && <button className="admin-secondary admin-more" onClick={loadMore} disabled={loadingMore || saving}>{loadingMore ? "読み込み中…" : "さらに読み込む"}</button>}
        <p className="admin-library-note">保存した動画とメモは、自分のアカウントだけで使えます。</p>
      </section>
    </div>
  );
}
