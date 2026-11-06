"use client";

import { useState } from "react";
import type { CameraVideo } from "@/types/video";
import { usePlaylistWeather } from "@/hooks/usePlaylistWeather";
import { weatherLabel } from "@/lib/weather";

export function InfoTicker({ videos }: { videos: CameraVideo[] }) {
  const [paused, setPaused] = useState(false);
  const results = usePlaylistWeather(videos);
  const hasLocation = videos.some(video => video.location);
  const information = videos.map(video => {
    const location = video.location;
    const result = location ? results[`${location.latitude},${location.longitude}`] : null;
    const weather = !location ? "天気未登録" : !result ? "天気取得中…" : result.error || !result.weather ? "天気取得不可" : `${weatherLabel(result.weather.code)} ${result.weather.temperature.toFixed(1)}°C`;
    return <span className="ticker-entry" key={video.id}><span className="ticker-title">{video.title}</span><span title={result?.weather ? `${result.weather.time}（日本時間）の予報値` : undefined}>{weather}</span></span>;
  });
  const duration = Math.max(48, videos.reduce((length, video) => length + video.title.length * 9 + 220, 0) / 30);
  return <section className={`info-strip${paused ? " is-paused" : ""}`} aria-label="登録した景色のタイトルと天気">
    <div className="info-viewport"><div className="info-track" style={{ animationDuration: `${duration}s` }}><div className="info-copy">{information}</div><div className="info-copy" aria-hidden="true">{information}</div></div></div>
    {hasLocation && <span className="weather-credit"><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" title="天気はOpen-Meteoの予報値です">Open-Meteo</a><a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" title="地名データの出典">GeoNames</a></span>}
    <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? "情報帯のスクロールを再開" : "情報帯のスクロールを停止"}>{paused ? "流す" : "固定"}</button>
  </section>;
}
