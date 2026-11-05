"use client";

import { useState } from "react";
import type { CameraLocation } from "@/types/location";
import { useLocationWeather } from "@/hooks/useLocationWeather";
import { weatherLabel } from "@/lib/weather";

export function InfoTicker({ title, location }: { title: string; location?: CameraLocation | null }) {
  const [paused, setPaused] = useState(false);
  const result = useLocationWeather(location);
  const weather = !location ? "地点未登録" : !result ? "取得中…" : result.error || !result.weather ? "取得できません" : `${weatherLabel(result.weather.code)} ${result.weather.temperature.toFixed(1)}°C`;
  const information = <><span className="ticker-title">{title}</span><span>地点：{location?.name ?? "未登録"}</span><span title={result?.weather ? `${result.weather.time}（日本時間）の予報値` : undefined}>天気：{weather}</span></>;
  return <section className={`info-strip${paused ? " is-paused" : ""}`} aria-label="風景の情報">
    <div className="info-viewport"><div className="info-track"><div className="info-copy">{information}</div><div className="info-copy" aria-hidden="true">{information}</div></div></div>
    {location && <span className="weather-credit"><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" title="天気はOpen-Meteoの予報値です">Open-Meteo</a><a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" title="地名データの出典">GeoNames</a></span>}
    <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? "情報帯のスクロールを再開" : "情報帯のスクロールを停止"}>{paused ? "流す" : "固定"}</button>
  </section>;
}
