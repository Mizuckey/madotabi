"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function getBrowserSupabase(url: string, publishableKey: string) {
  if (typeof window === "undefined") {
    // サーバー描画ではセッションを共有・永続化しない。
    return createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  browserClient ??= createClient(url, publishableKey, {
    auth: { storageKey: "madotabi-admin-auth" },
  });
  return browserClient;
}
