"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { PrivateWatch } from "./PrivateWatch";
import { SubmissionManager } from "./SubmissionManager";

export function PersonalWorkspace({ supabase, userId, initialView }: { supabase: SupabaseClient; userId: string; initialView: "watch" | "add" }) {
  const [view, setView] = useState(initialView);
  const [initialVideoId, setInitialVideoId] = useState<string>();
  function watch(videoId?: string) {
    setInitialVideoId(videoId);
    setView("watch");
  }
  return <div className="personal-workspace">
    <nav className="personal-navigation" aria-label="画面切替">
      <button type="button" className="admin-secondary" aria-pressed={view === "watch"} onClick={() => watch()}>景色を見る</button>
      <button type="button" className="admin-secondary" aria-pressed={view === "add"} onClick={() => setView("add")}>景色リスト</button>
    </nav>
    <div className={`personal-stage${view === "add" ? " is-library" : ""}`}>{view === "watch" ? <PrivateWatch supabase={supabase} userId={userId} initialVideoId={initialVideoId} /> : <SubmissionManager supabase={supabase} userId={userId} onWatch={watch} />}</div>
  </div>;
}
