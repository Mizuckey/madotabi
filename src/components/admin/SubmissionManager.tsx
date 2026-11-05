"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { CameraPlayer } from "@/components/player/CameraPlayer";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";

type Submission = {
  id: string;
  youtube_video_id: string;
  youtube_url: string;
  title: string;
  notes: string;
  created_at: string;
  publication: { id: string } | null;
};
const fields = "id,youtube_video_id,youtube_url,title,notes,created_at,publication:camera_videos(id)";
const pageSize = 20;

export function SubmissionManager({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const [items, setItems] = useState<Submission[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState("");
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publicationMessage, setPublicationMessage] = useState("");
  const [publicationError, setPublicationError] = useState("");
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
    if (saving || loading || loadingMore || publishingId) return;
    setSaveError(""); setSuccess(""); setTouched(true);
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
      setSuccess("URLを保存しました。公開用カメラへの反映は、配信情報を確認してから行います。");
      form.reset(); setUrl(""); setTouched(false);
      await reload();
      urlInput.current?.focus();
    } catch { setSaveError("接続できませんでした。入力内容はそのままで再度お試しください。"); }
    finally { setSaving(false); }
  }

  async function changePublication(item: Submission) {
    if (publishingId || saving || loading || loadingMore) return;
    setPublishingId(item.id); setPublicationMessage(""); setPublicationError("");
    try {
      const { error } = item.publication
        ? await supabase.from("camera_videos").delete().eq("id", item.id).select("id").single()
        : await supabase.rpc("publish_camera_submission", { submission_id: item.id });
      if (error) { setPublicationError("公開状態を変更できませんでした。管理権限と通信状況を確認し、一覧を更新してください。"); return; }
      setItems(current => current.map(existing => existing.id === item.id ? { ...existing, publication: item.publication ? null : { id: item.id } } : existing));
      setPublicationMessage(item.publication ? "トップページから非公開にしました。" : "トップページに公開しました。公開されるのはタイトルとYouTube動画情報だけです。");
    } catch { setPublicationError("公開状態を変更できませんでした。通信状況を確認してください。"); }
    finally { setPublishingId(null); }
  }

  return (
    <div className="admin-workspace">
      <section className="admin-card admin-add-card" aria-labelledby="add-title">
        <div className="admin-card-heading"><span className="admin-step">01 / ADD A VIEW</span><h2 id="add-title">動画URLを追加</h2><p>まずはURLだけでOK。気づいたことはメモに残せます。</p></div>
        {success && <p className="admin-notice" role="status">{success}</p>}
        {saveError && <p className="admin-error" role="alert">{saveError}</p>}
        <form onSubmit={save} className="admin-form">
          <label htmlFor="camera-url">YouTube URL <span className="admin-required">必須</span></label>
          <input ref={urlInput} id="camera-url" name="url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://www.youtube.com/watch?v=…" required maxLength={2048} value={url} onChange={e => { setUrl(e.target.value); setSaveError(""); setSuccess(""); }} onBlur={() => setTouched(true)} disabled={saving} aria-invalid={touched && !!url && !parsed} aria-describedby="url-help" />
          <p className="admin-field-hint" id="url-help">{parsed ? `動画ID：${parsed.videoId} · URLの形式を確認しました` : touched && url ? "YouTubeの動画URLを確認してください。" : "通常の動画URL、短縮URL、/live/ 形式に対応。"}</p>
          <label htmlFor="camera-title">タイトル <span className="admin-optional">任意</span></label>
          <input id="camera-title" name="title" type="text" maxLength={100} placeholder="例：海が見えるライブカメラ" disabled={saving} />
          <label htmlFor="camera-notes">メモ <span className="admin-optional">任意</span></label>
          <textarea id="camera-notes" name="notes" rows={3} maxLength={1000} placeholder="場所や気づいたことなど" disabled={saving} />
          <button className="admin-primary" type="submit" disabled={saving || loading || loadingMore || !!publishingId}>{saving ? "保存しています…" : "URLを保存"}<span aria-hidden="true"> ＋</span></button>
          <p className="admin-security-note">配信の実在・ライブ状態・埋め込み可否は未確認のまま保存されます。</p>
        </form>
      </section>
      <section className="admin-library" aria-labelledby="library-title">
        <div className="admin-library-header"><div><span className="admin-step">02 / YOUR COLLECTION</span><h2 id="library-title">登録候補 <span className="admin-count">{loading ? "—" : count}</span></h2></div><button className="admin-secondary" type="button" onClick={reload} disabled={loading || loadingMore || saving || !!publishingId}>更新</button></div>
        {publicationMessage && <p className="admin-notice" role="status">{publicationMessage}</p>}
        {publicationError && <p className="admin-error" role="alert">{publicationError}</p>}
        {listError && <div className="admin-error" role="alert">{listError} <button className="admin-text-button" onClick={reload} disabled={loading}>再取得</button></div>}
        {loading ? <div className="admin-card admin-empty" role="status">登録候補を読み込んでいます…</div> : items.length === 0 && !listError ? (
          <div className="admin-card admin-empty"><span className="admin-empty-mark" aria-hidden="true">＋</span><h3>次に眺めたい景色を、ひとつ。</h3><p>保存したYouTube URLがここに並びます。<br />スマホで見つけたときにも、そのまま追加できます。</p></div>
        ) : (
          <ul className="admin-items">{items.map(item => (
            <li key={item.id} className="admin-item"><div className="admin-item-top"><span className="admin-item-label">{item.publication ? "公開中" : "登録候補"}</span><time dateTime={item.created_at}>{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.created_at))}</time></div><h3>{item.title || "タイトル未設定"}</h3><a className="admin-video-link" href={item.youtube_url} target="_blank" rel="noopener noreferrer">{item.youtube_url}<span aria-hidden="true"> ↗</span></a>{item.notes && <p className="admin-item-notes">{item.notes}</p>}
              <div className="admin-video-actions">
                <button className="admin-secondary" type="button" aria-expanded={previewId === item.id} aria-controls={`preview-${item.id}`} onClick={() => setPreviewId(current => current === item.id ? null : item.id)}>{previewId === item.id ? "プレビューを閉じる" : "動画をプレビュー"}</button>
                <Link className="admin-watch-link" href={`/watch/${item.youtube_video_id}`} target="_blank" rel="noopener noreferrer">別画面で視聴 ↗</Link>
                <button className="admin-secondary" type="button" disabled={!!publishingId || saving || loading || loadingMore} onClick={() => changePublication(item)}>{publishingId === item.id ? "変更中…" : item.publication ? "非公開に戻す" : "トップに公開"}</button>
              </div>
              {previewId === item.id && <div className="admin-video-preview" id={`preview-${item.id}`}><p>プレビューしても公開状態は変わりません。</p><CameraPlayer video={{ id: item.id, title: item.title || "YouTube動画", youtubeVideoId: item.youtube_video_id }} /></div>}
            </li>
          ))}</ul>
        )}
        {!loading && items.length > 0 && items.length < count && <button className="admin-secondary admin-more" onClick={loadMore} disabled={loadingMore || saving || !!publishingId}>{loadingMore ? "読み込み中…" : "さらに読み込む"}</button>}
        <p className="admin-library-note">候補とメモは管理者だけが閲覧できます。「トップに公開」で、動画情報だけを公開できます。</p>
      </section>
    </div>
  );
}
