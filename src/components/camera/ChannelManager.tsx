"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useState, type FormEvent } from "react";
import type { ChannelWatch } from "@/types/channel";
import { MAX_WATCHED_CHANNELS, parseChannelUrl } from "@/lib/youtube-channel";

type Props = { supabase: SupabaseClient; userId: string; channels: ChannelWatch[]; configured: boolean | null; checking: boolean; error: string; refresh(manual?: boolean): Promise<void> };

export function ChannelManager({ supabase, userId, channels, configured, checking, error, refresh }: Props) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const enabledCount = channels.filter(channel => channel.enabled).length;
  const busy = saving || checking;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || configured === null) return;
    const parsed = parseChannelUrl(url);
    if (!parsed) { setSaveError("/@ハンドル、/channel/チャンネルID、/user/ユーザー名のURLを入力してください。/c/形式はハンドルURLに変更してください。"); return; }
    if (enabledCount >= MAX_WATCHED_CHANNELS) { setSaveError("確認するチャンネルは5件までです。先に不要なチャンネルを停止してください。"); return; }
    setSaving(true); setSaveError(""); setNotice("");
    try {
      const { error } = await supabase.from("channel_watches").insert({ created_by: userId, channel_ref: parsed.ref, channel_url: parsed.url, channel_title: parsed.title });
      if (error) { setSaveError(error.code === "23505" ? "このチャンネルは登録済みです。停止中なら再開してください。" : "保存できませんでした。通信状況や登録件数を確認してください。"); return; }
      setUrl(""); setNotice("チャンネルを登録しました。"); await refresh(true);
    } catch { setSaveError("保存結果を確認できませんでした。更新して確認してください。"); }
    finally { setSaving(false); }
  }

  async function toggle(channel: ChannelWatch) {
    if (busy) return;
    setSaving(true); setSaveError(""); setNotice("");
    try {
      const { error } = await supabase.from("channel_watches").update({ enabled: !channel.enabled }).eq("id", channel.id).eq("created_by", userId);
      if (error) throw new Error("Update failed");
      await refresh(true); setNotice(channel.enabled ? "ライブの確認を停止しました。後から再開できます。" : "ライブの確認を再開しました。");
    } catch { setSaveError("変更できませんでした。確認中のチャンネルは5件までです。"); }
    finally { setSaving(false); }
  }

  return <details className="admin-card channel-manager">
    <summary>ライブを待つチャンネル <span className="admin-count">{enabledCount}</span></summary>
    <p className="admin-field-hint">窓旅を開いている間だけ、チャンネルごとに最短30分間隔で確認します。最大5件。配信を見つけると視聴画面に通知します。</p>
    {configured === false && <p className="admin-notice" role="status">チャンネルは登録できます。ライブの確認にはYouTube Data APIキーの設定が必要です。</p>}
    {configured === null && !error && <p role="status">チャンネルを読み込んでいます…</p>}
    {(saveError || error) && <p className="admin-error" role="alert">{saveError || error}</p>}
    {notice && <p className="admin-field-hint" role="status">{notice}</p>}
    <form className="admin-form channel-add-form" onSubmit={save}>
      <label htmlFor="channel-url">YouTubeチャンネルURL</label>
      <input id="channel-url" required type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={2048} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.youtube.com/@…" disabled={busy || configured === null} />
      <button className="admin-secondary" type="submit" disabled={busy || configured === null || enabledCount >= MAX_WATCHED_CHANNELS}>チャンネルを登録</button>
    </form>
    <ul className="channel-list">{channels.map(channel => <li key={channel.id}>
      <div><a href={channel.channel_url} target="_blank" rel="noopener noreferrer">{channel.channel_title} ↗</a><p className="admin-field-hint">{!channel.enabled ? "確認を停止中" : configured === false ? "API設定待ち" : channel.last_error ? "前回の確認に失敗しました" : channel.last_checked_at ? `最終確認 ${new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(channel.last_checked_at))}（日本時間）` : "未確認"}</p></div>
      <button type="button" className="admin-secondary" disabled={busy || (!channel.enabled && enabledCount >= MAX_WATCHED_CHANNELS)} onClick={() => void toggle(channel)}>{channel.enabled ? "確認を停止" : "再開"}</button>
    </li>)}</ul>
    <button type="button" className="admin-secondary" disabled={busy} onClick={() => void refresh(true)}>{checking ? "確認しています…" : "確認状況を更新"}</button>
    <p className="admin-field-hint">更新や再読み込みをしても、30分以内は保存済みの結果を使います。APIの上限や配信側の設定により見つからない場合があります。</p>
  </details>;
}
