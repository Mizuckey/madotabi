"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LocationPicker } from "@/components/camera/LocationPicker";
import { locationColumns, locationFromRow } from "@/lib/location";
import type { CameraLocation, LocationColumns } from "@/types/location";
import { useSceneryDrag } from "@/hooks/useSceneryDrag";
import { reorderScenery } from "@/lib/scenery-order";
import { useDaylight } from "@/hooks/useDaylight";
import { solarDay, locationKey } from "@/lib/daylight";
import { parseYouTubeUrl } from "@/lib/youtube";

type Submission = {
  id: string;
  youtube_video_id: string;
  youtube_url: string;
  title: string;
  night_view: boolean;
  created_at: string;
  position: number;
  deleted_at: string | null;
} & LocationColumns;
const fields = "id,youtube_video_id,youtube_url,title,night_view,created_at,position,deleted_at,location_name,latitude,longitude";
const pageSize = 100;

export function SubmissionManager({ supabase, userId, onWatch }: { supabase: SupabaseClient; userId: string; onWatch(videoId: string): void }) {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string; nightView: boolean; location: CameraLocation | null } | null>(null);
  const [editError, setEditError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [listError, setListError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newNightView, setNewNightView] = useState(false);
  const [newLocation, setNewLocation] = useState<CameraLocation | null>(null);
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  const urlInput = useRef<HTMLInputElement>(null);
  const parsed = parseYouTubeUrl(url);

  const loadList = useCallback(async (signal?: AbortSignal) => {
    const rows: Submission[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const query = supabase.from("camera_submissions").select(fields).eq("created_by", userId).order("position").order("id").range(offset, offset + pageSize - 1);
      const { data, error } = await (signal ? query.abortSignal(signal) : query).returns<Submission[]>();
      if (signal?.aborted) return null;
      if (error) throw new Error("List unavailable");
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    return signal?.aborted ? null : [...new Map(rows.map(row => [row.id, row])).values()];
  }, [supabase, userId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadList(controller.signal).then(rows => { if (rows) { setItems(rows); setListError(""); } }).catch(() => { if (!controller.signal.aborted) setListError("景色リストを取得できませんでした。再度お試しください。"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [loadList]);

  const active = items.filter(item => !item.deleted_at);
  const deleted = items.filter(item => item.deleted_at);
  const visible = showDeleted ? deleted : active;
  const busy = loading || saving || changing;
  const daylight = useDaylight(active.map(item => ({ id: item.id, title: item.title, youtubeVideoId: item.youtube_video_id, location: locationFromRow(item), nightView: item.night_view })));
  const drag = useSceneryDrag(active.map(item => item.id), busy || showDeleted || !!editing, reorder);
  function sunlight(item: Submission) {
    const location = locationFromRow(item);
    if (!location) return item.night_view ? '夜景ON · 地点未登録でも再生' : '地点未登録 · 夜景OFFのため再生対象外';
    const reading = daylight.readings[locationKey(location.latitude, location.longitude)];
    const day = solarDay(reading, daylight.now);
    if (!day) return `${item.night_view ? '夜景ON · ' : ''}${reading?.error ? '日照時刻を取得できません' : '日照時刻を確認中…'}`;
    const format = (time: number) => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(time);
    return `日の出 ${format(day.sunrise)} · 日の入り ${format(day.sunset)} · 夜景${item.night_view ? 'ON' : 'OFF'}`;
  }

  async function reload() {
    setLoading(true);
    try { const rows = await loadList(); if (rows) { setItems(rows); setListError(""); } }
    catch { setListError("景色リストを取得できませんでした。再度お試しください。"); }
    finally { setLoading(false); }
  }

  async function reorder(sourceId: string, targetId: string) {
    if (busy || sourceId === targetId) return;
    const ids = reorderScenery(active.map(item => item.id), sourceId, targetId);
    setChanging(true); setActionError(""); setMessage("");
    try {
      const { error } = await supabase.rpc("reorder_camera_submissions", { ordered_ids: ids });
      if (error) throw new Error("Reorder failed");
      const rows = await loadList();
      if (rows) { setItems(rows); setListError(""); }
      setMessage("並び順を保存しました。この順番で再生します。");
    } catch { setActionError("並び順の保存結果を確認できませんでした。リストを更新して、もう一度お試しください。"); }
    finally { setChanging(false); }
  }

  async function changeDeleted(item: Submission, isDeleted: boolean) {
    if (busy) return;
    setChanging(true); setActionError(""); setMessage("");
    try {
      const { error } = await supabase.rpc("set_camera_submission_deleted", { submission_id: item.id, is_deleted: isDeleted });
      if (error) throw new Error("Update failed");
      const rows = await loadList();
      if (rows) { setItems(rows); setListError(""); }
      setConfirmDelete(null);
      setMessage(isDeleted ? "景色を削除しました。「削除した景色」から元に戻せます。" : "景色をリストの末尾に戻しました。");
    } catch { setActionError("変更結果を確認できませんでした。リストを更新して、もう一度お試しください。"); }
    finally { setChanging(false); }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    const title = editing.title.trim();
    if (!title) { setEditError("タイトルを入力してください。"); return; }
    if (title.length > 100) { setEditError("タイトルは100文字以内で入力してください。"); return; }
    setChanging(true); setEditError(""); setMessage("");
    try {
      const { data, error } = await supabase.from("camera_submissions").update({ title, night_view: editing.nightView, ...locationColumns(editing.location) }).eq("id", editing.id).eq("created_by", userId).select(fields).single<Submission>();
      if (error || !data) throw new Error("Edit failed");
      setItems(current => current.map(item => item.id === data.id ? data : item));
      setEditing(null);
      setMessage("景色の情報を保存しました。");
    } catch { setEditError("保存結果を確認できませんでした。入力は残しています。再度保存するか、リストを更新して確認してください。"); }
    finally { setChanging(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading || changing) return;
    setSaveError(""); setSaveNotice(""); setTouched(true);
    if (!parsed) { setSaveError("YouTubeの動画URLを入力してください。watch・youtu.be・live形式などに対応しています。"); urlInput.current?.focus(); return; }
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = String(values.get("title") ?? "").trim();
    if (!title || title.length > 100) { setSaveError("タイトルを1〜100文字で入力してください。"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("camera_submissions").insert({ youtube_video_id: parsed.videoId, youtube_url: parsed.canonicalUrl, title, night_view: newNightView, ...locationColumns(newLocation), created_by: userId });
      if (error) {
        setSaveError(error.code === "23505" ? "この動画は登録済みです。削除した場合は「削除した景色」から戻せます。" : "保存できませんでした。入力内容・通信状況・ログイン状態を確認して再度お試しください。");
        return;
      }
      form.reset(); setUrl(""); setNewTitle(""); setNewLocation(null); setNewNightView(false); setTouched(false);
      setFormVersion(version => version + 1);
      setSaveNotice(`「${title}」を保存しました。続けて登録できます。`);
      setShowDeleted(false);
      try { const rows = await loadList(); if (rows) { setItems(rows); setListError(""); } }
      catch { setListError("保存は完了しましたが、一覧を更新できませんでした。「更新」で再取得してください。"); }
      requestAnimationFrame(() => urlInput.current?.focus());
    } catch { setSaveError("接続できませんでした。入力内容はそのままで再度お試しください。"); }
    finally { setSaving(false); }
  }

  return (
    <div className="admin-workspace">
      <section className="admin-card admin-add-card" aria-labelledby="add-title">
        <div className="admin-card-heading"><span className="admin-step">01 / ADD A VIEW</span><h2 id="add-title">動画URLを追加</h2><p>URLとタイトルを登録。地名から天気の地点も選べます。</p></div>
        {saveError && <p className="admin-error" role="alert">{saveError}</p>}
        {saveNotice && <p className="admin-notice" role="status">{saveNotice}</p>}
        <form onSubmit={save} className="admin-form">
          <label htmlFor="camera-url">YouTube URL <span className="admin-required">必須</span></label>
          <input ref={urlInput} id="camera-url" name="url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://www.youtube.com/watch?v=…" required maxLength={2048} value={url} onChange={e => { setUrl(e.target.value); setSaveError(""); }} onBlur={() => setTouched(true)} disabled={busy} aria-invalid={touched && !!url && !parsed} aria-describedby="url-help" />
          <p className="admin-field-hint" id="url-help">{parsed ? `動画ID：${parsed.videoId} · URLの形式を確認しました` : touched && url ? "YouTubeの動画URLを確認してください。" : "通常の動画URL、短縮URL、/live/ 形式に対応。"}</p>
          <label htmlFor="camera-title">タイトル <span className="admin-required">必須</span></label>
          <input id="camera-title" name="title" type="text" required maxLength={100} placeholder="例：札幌すすきの ライブカメラ" value={newTitle} onChange={e => setNewTitle(e.target.value)} disabled={busy} />
          <LocationPicker key={formVersion} title={newTitle} value={newLocation} onChange={setNewLocation} disabled={busy} />
          <label className="night-view-option"><input type="checkbox" checked={newNightView} disabled={busy} onChange={event => setNewNightView(event.target.checked)} />夜景ON（日没後も再生）</label>
          <p className="admin-field-hint">夜景OFFは、登録地点の日の出〜日の入りだけ再生します。地点未登録・日照時刻が不明な場合も再生対象外です。</p>
          <button className="admin-primary" type="submit" disabled={saving || loading || changing}>{saving ? "保存しています…" : "景色を登録"}<span aria-hidden="true"> ＋</span></button>
          <p className="admin-security-note">配信の実在・ライブ状態・埋め込み可否は未確認のまま保存されます。</p>
        </form>
      </section>
      <section className="admin-library" aria-labelledby="library-title">
        <div className="admin-library-header"><div><span className="admin-step">02 / YOUR COLLECTION</span><h2 id="library-title">景色リスト <span className="admin-count">{loading ? "—" : active.length}</span></h2></div><button className="admin-secondary" type="button" onClick={reload} disabled={busy}>更新</button></div>
        <div className="scenery-list-tabs"><button className="admin-secondary" type="button" aria-pressed={!showDeleted} disabled={busy} onClick={() => { setShowDeleted(false); setConfirmDelete(null); setEditing(null); }}>再生する景色</button><button className="admin-secondary" type="button" aria-pressed={showDeleted} disabled={busy} onClick={() => { setShowDeleted(true); setConfirmDelete(null); setEditing(null); }}>削除した景色 ({deleted.length})</button></div>
        {message && <p className="admin-notice" role="status">{message}</p>}
        {actionError && <p className="admin-error" role="alert">{actionError}</p>}
        {listError && <div className="admin-error" role="alert">{listError} <button className="admin-text-button" onClick={reload} disabled={loading}>再取得</button></div>}
        {loading ? <div className="admin-card admin-empty" role="status">登録した動画を読み込んでいます…</div> : visible.length === 0 && !listError ? (
          <div className="admin-card admin-empty"><span className="admin-empty-mark" aria-hidden="true">＋</span><h3>{showDeleted ? "削除した景色はありません" : "次に眺めたい景色を、ひとつ。"}</h3><p>{showDeleted ? "削除した景色はここからリストに戻せます。" : "URLを追加すると、ここに景色が並びます。"}</p></div>
        ) : (
          <><p className="admin-field-hint" id="reorder-help">左のハンドルをドラッグして並び替えます。キーボードはSpaceでつかみ、上下キーで移動、Enterで保存できます。</p><p className="sr-only" role="status">{drag.announcement}</p><ul className="admin-items">{visible.map((item, index) => (
            <li key={item.id} className="admin-item" data-scenery-id={item.id} data-dragging={drag.source === item.id} data-drop-target={drag.target === item.id && drag.source !== item.id}><div className="admin-item-top">{!showDeleted && <button className="scenery-drag-handle" type="button" disabled={busy || !!editing} aria-label={`${item.title}をドラッグして並び替え`} aria-describedby="reorder-help" {...drag.handles(item.id)}><svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true"><path d="M5 3h1m4 0h1M5 9h1m4 0h1M5 15h1m4 0h1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></button>}<span className="admin-item-label">{showDeleted ? "削除済み" : `${index + 1} 番目`}</span><time dateTime={item.created_at}>{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.created_at))}</time></div><h3 title={item.title || "タイトル未設定"}>{item.title || "タイトル未設定"}</h3><a className="admin-video-link" href={item.youtube_url} target="_blank" rel="noopener noreferrer">{item.youtube_url}<span aria-hidden="true"> ↗</span></a>{item.location_name && <p className="scenery-location">天気の地点：{item.location_name}</p>}<p className="scenery-sunlight">{sunlight(item)}</p>
              <div className="admin-video-actions">
                <button className="admin-secondary" type="button" disabled={busy} onClick={() => { setEditing({ id: item.id, title: item.title, nightView: item.night_view, location: locationFromRow(item) }); setEditError(""); setConfirmDelete(null); }}>編集</button>
                {showDeleted ? <button className="admin-secondary" type="button" disabled={busy} onClick={() => changeDeleted(item, false)}>リストに戻す</button> : <>
                  <button className="admin-secondary" type="button" disabled={busy} onClick={() => onWatch(item.youtube_video_id)}>この景色を見る →</button>
                  <button className="admin-text-button" type="button" disabled={busy} onClick={() => { setConfirmDelete(item.id); setEditing(null); }}>削除</button>
                </>}
              </div>
              {editing?.id === item.id && <form className="admin-form scenery-edit-form" onSubmit={saveEdit} aria-label="景色を編集">
                <label htmlFor={`edit-title-${item.id}`}>タイトル</label><input id={`edit-title-${item.id}`} required value={editing.title} maxLength={100} disabled={busy} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                <LocationPicker title={editing.title} value={editing.location} onChange={location => setEditing({ ...editing, location })} disabled={busy} />
                <label className="night-view-option"><input type="checkbox" checked={editing.nightView} disabled={busy} onChange={event => setEditing({ ...editing, nightView: event.target.checked })} />夜景ON（日没後も再生）</label>
                {editError && <p className="admin-error" role="alert">{editError}</p>}
                <div className="admin-video-actions"><button className="admin-primary" type="submit" disabled={busy}>{changing ? "保存中…" : "変更を保存"}</button><button className="admin-secondary" type="button" disabled={busy} onClick={() => { setEditing(null); setEditError(""); }}>キャンセル</button></div>
              </form>}
              {confirmDelete === item.id && !showDeleted && <div className="scenery-delete-confirm" role="group" aria-label="景色の削除確認"><p>この景色を再生リストから削除しますか？ 後から戻せます。</p><button className="admin-secondary" type="button" disabled={busy} onClick={() => setConfirmDelete(null)}>残す</button><button className="admin-secondary" type="button" disabled={busy} onClick={() => changeDeleted(item, true)}>削除する</button></div>}
            </li>
          ))}</ul></>
        )}
        <p className="admin-library-note">上から順番に、日照時刻と夜景設定に合う景色を再生します。並び順は保存され、削除した景色は後から戻せます。</p>
      </section>
    </div>
  );
}
