"use client";

import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useEffect, useState, type FormEvent } from "react";
import { SubmissionManager } from "./SubmissionManager";
import { PrivateWatch } from "./PrivateWatch";

export function AdminConsole({ supabaseUrl, publishableKey, view = "library" }: { supabaseUrl: string; publishableKey: string; view?: "library" | "watch" }) {
  // 渡すキーはpublishable keyのみ。管理権限はDB側でも毎回確認する。
  const [supabase] = useState(() => getBrowserSupabase(supabaseUrl, publishableKey));
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [access, setAccess] = useState<{ userId: string; allowed: boolean; error: boolean } | null>(null);
  const [accessRetry, setAccessRetry] = useState(0);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let changed = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && !changed) { setUser(data.user); setSessionReady(true); }
    }).catch(() => { if (active && !changed) setSessionReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (active) { setUser(session?.user ?? null); setSessionReady(true); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void supabase.rpc("is_camera_admin").then(({ data, error }) => {
      if (active) setAccess({ userId: user.id, allowed: data === true && !error, error: !!error });
    }, () => { if (active) setAccess({ userId: user.id, allowed: false, error: true }); });
    return () => { active = false; };
  }, [supabase, user, accessRetry]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get("email") ?? "").trim().toLowerCase();
    const password = String(values.get("password") ?? "");
    setBusy(true); setError(""); setNotice("");
    try {
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        const code = result.error.code;
        if (code === "email_not_confirmed") setError("確認メールのリンクを開いてからログインしてください。");
        else if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") setError("しばらく時間をおいて、もう一度お試しください。");
        else if (mode === "signup") setError("登録できませんでした。入力内容を確認してください。登録済みの場合はログインをお試しください。");
        else setError("ログインできませんでした。メールアドレスとパスワードを確認してください。");
        return;
      }
      form.reset();
      if (mode === "signup") {
        setNotice("確認メールを送信しました。メール内のリンクを開いた後、この管理画面に戻ってログインしてください。届かない場合は迷惑メールフォルダもご確認ください。");
        setMode("login");
      }
    } catch { setError("接続できませんでした。通信状況を確認して再度お試しください。"); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) setError("ログアウトできませんでした。再度お試しください。");
      else { setUser(null); setAccess(null); setNotice(""); }
    } catch { setError("ログアウトできませんでした。通信状況をご確認ください。"); }
    finally { setBusy(false); }
  }

  if (!sessionReady) return <section className="admin-card admin-loading" role="status">ログイン状態を確認しています…</section>;

  if (!user) return (
    <div className="admin-auth-layout">
      <section className="admin-intro">
        <span className="admin-kicker">YOUR NEXT VIEW</span>
        <h2>見つけたら、<br />URLをひとつ。</h2>
        <p>旅先の風景も、いつもの街も。<br />気になったライブカメラを、<br />スマホから手軽に残せます。</p>
        <div className="admin-intro-note"><span className="status-dot" />管理者専用のカメラ登録ページ</div>
      </section>
      <section className="admin-card admin-auth-card" aria-labelledby="login-title">
        <div className="admin-card-heading"><span className="admin-step">01 / ACCESS</span><h2 id="login-title">{mode === "signup" ? "初回アカウント登録" : "管理画面にログイン"}</h2><p>管理者として設定したメールアドレスを使用してください。</p></div>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        <form onSubmit={authenticate} className="admin-form">
          <label htmlFor="admin-email">メールアドレス</label>
          <input id="admin-email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} disabled={busy} placeholder="メールアドレスを入力" />
          <label htmlFor="admin-password">パスワード</label>
          <input id="admin-password" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 12 : 1} maxLength={128} disabled={busy} aria-describedby={mode === "signup" ? "password-help" : undefined} />
          {mode === "signup" && <p className="admin-field-hint" id="password-help">12文字以上で設定してください。登録後に確認メールが届きます。</p>}
          <button className="admin-primary" type="submit" disabled={busy}>{busy ? "処理しています…" : mode === "signup" ? "登録して確認メールを送る" : "ログイン"}<span aria-hidden="true"> →</span></button>
        </form>
        <button type="button" className="admin-text-button" disabled={busy} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setNotice(""); }}>{mode === "login" ? "はじめての方：アカウントを登録" : "登録済みの方：ログインへ戻る"}</button>
        <p className="admin-security-note">アカウント登録だけでは管理権限は付与されません。</p>
      </section>
    </div>
  );

  const currentAccess = access?.userId === user.id ? access : null;
  return (
    <>
      <div className="admin-session"><div><span className="admin-session-dot" />ログイン中 <span className="admin-session-email">{user.email}</span></div><button className="admin-secondary" onClick={signOut} disabled={busy}>{busy ? "処理中…" : "ログアウト"}</button></div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {!currentAccess ? <section className="admin-card" role="status">管理権限を確認しています…</section> : currentAccess.error ? (
        <section className="admin-card"><h2>管理権限を確認できませんでした</h2><p>通信状況を確認して、再度お試しください。</p><button className="admin-secondary" onClick={() => { setAccess(null); setAccessRetry(v => v + 1); }}>再確認</button></section>
      ) : !currentAccess.allowed ? (
        <section className="admin-card"><h2>このアカウントに管理権限はありません</h2><p>管理者として指定したメールアドレスか、メール確認が完了しているかをご確認ください。</p></section>
      ) : view === "watch" ? <PrivateWatch key={user.id} supabase={supabase} /> : <SubmissionManager key={user.id} supabase={supabase} userId={user.id} />}
    </>
  );
}
