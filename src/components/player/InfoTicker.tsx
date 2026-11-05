"use client";

import { useState } from "react";

export function InfoTicker({ title }: { title: string }) {
  const [paused, setPaused] = useState(false);
  const information = <><span className="ticker-title">{title}</span><span>位置：未登録</span><span>天気：未取得</span></>;
  return <section className={`info-strip${paused ? " is-paused" : ""}`} aria-label="風景の情報">
    <div className="info-viewport"><div className="info-track"><div className="info-copy">{information}</div><div className="info-copy" aria-hidden="true">{information}</div></div></div>
    <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? "情報帯のスクロールを再開" : "情報帯のスクロールを停止"}>{paused ? "流す" : "固定"}</button>
  </section>;
}
