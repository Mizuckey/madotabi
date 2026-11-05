"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CameraLocation } from "@/types/location";
import { locationQueryFromTitle, searchLocations } from "@/lib/location";

type Props = { title: string; value: CameraLocation | null; onChange(value: CameraLocation | null): void; disabled?: boolean };
export function LocationPicker({ title, value, onChange, disabled = false }: Props) {
  const id = useId();
  const details = useRef<HTMLDetailsElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [override, setOverride] = useState<{ title: string; text: string } | null>(null);
  const query = override?.title === title ? override.text : locationQueryFromTitle(title);
  const [search, setSearch] = useState<{ query: string; candidates: CameraLocation[] | null; error: string } | null>(null);
  const pending = search?.query === query && search.candidates === null && !search.error;
  useEffect(() => () => controller.current?.abort(), []);

  async function find() {
    if (disabled || pending) return;
    if (query.trim().length < 2) { setSearch({ query, candidates: [], error: "地名を2文字以上入力してください。" }); return; }
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setSearch({ query, candidates: null, error: "" });
    try {
      const candidates = await searchLocations(query, request.signal);
      if (!request.signal.aborted) setSearch({ query, candidates, error: "" });
    } catch { if (!request.signal.aborted) setSearch({ query, candidates: [], error: "検索できませんでした。通信状況を確認して再度お試しください。" }); }
  }
  return <details className="location-picker personal-details" ref={details} onToggle={event => { if (event.currentTarget.open && !value && query.trim().length >= 2 && search?.query !== query) void find(); }}>
    <summary>天気の地点：{value?.name ?? "未登録（任意）"}</summary>
    <div className="location-search">
      <label htmlFor={id}>タイトルから地点候補を検索</label>
      <div className="location-search-row"><input id={id} type="search" value={query} maxLength={100} disabled={disabled} placeholder="例：渋谷、札幌、富士吉田" onChange={e => setOverride({ title, text: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void find(); } }} /><button className="admin-secondary" type="button" disabled={disabled || pending} onClick={() => void find()}>{pending ? "検索中…" : "候補を探す"}</button></div>
      <p className="admin-field-hint">候補を確認して選択してください。見つからない場合は、近くの市区町村名で検索できます。</p>
      {search?.query === query && search.error && <p className="admin-error" role="alert">{search.error}</p>}
      {search?.query === query && search.candidates && !search.error && (search.candidates.length ? <ul className="location-candidates">{search.candidates.map(candidate => <li key={`${candidate.latitude},${candidate.longitude}`}><button type="button" disabled={disabled} onClick={() => { onChange(candidate); if (details.current) details.current.open = false; }}>{candidate.name}<small>{candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}</small></button></li>)}</ul> : <p className="admin-field-hint" role="status">候補がありません。地名を短くするか、市区町村名で検索してください。</p>)}
      {value && <button className="admin-text-button" type="button" disabled={disabled} onClick={() => onChange(null)}>登録地点を外す</button>}
      <p className="admin-field-hint">天気用の代表地点です。カメラの厳密な位置とは限りません。地点：<a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a> / <a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noopener noreferrer">Open-Meteo</a></p>
    </div>
  </details>;
}
