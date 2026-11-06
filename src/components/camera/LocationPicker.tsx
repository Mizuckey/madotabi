"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CameraLocation } from "@/types/location";
import { locationQueryFromTitle, searchLocations } from "@/lib/location";

type Props = { title: string; value: CameraLocation | null; onChange(value: CameraLocation | null): void; disabled?: boolean };
export function LocationPicker({ title, value, onChange, disabled = false }: Props) {
  const id = useId();
  const controller = useRef<AbortController | null>(null);
  const [override, setOverride] = useState<string | null>(null);
  const query = override ?? value?.name ?? locationQueryFromTitle(title);
  const selectedQuery = useRef<string | null>(value?.name ?? null);
  const [search, setSearch] = useState<{ query: string; candidates: CameraLocation[] | null; error: string } | null>(null);
  const pending = search?.query === query && search.candidates === null && !search.error;

  const find = useCallback(async (text: string) => {
    if (disabled || text.trim().length < 2) return;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setSearch({ query: text, candidates: null, error: "" });
    try {
      const candidates = await searchLocations(text, request.signal);
      if (!request.signal.aborted) setSearch({ query: text, candidates, error: "" });
    } catch { if (!request.signal.aborted) setSearch({ query: text, candidates: [], error: "検索できませんでした。地名を確認して再検索してください。" }); }
  }, [disabled]);

  useEffect(() => {
    if (disabled || query.trim().length < 2 || (value && selectedQuery.current === query)) return;
    const timer = setTimeout(() => { void find(query); }, 500);
    return () => { clearTimeout(timer); controller.current?.abort(); };
  }, [query, value, disabled, find]);
  useEffect(() => () => controller.current?.abort(), []);

  function choose(candidate: CameraLocation) {
    controller.current?.abort(); selectedQuery.current = candidate.name;
    setOverride(candidate.name); setSearch(null); onChange(candidate);
  }

  return <section className="location-picker" aria-label="天気の地点を選択">
    <label htmlFor={id}>天気の地点 <span className="admin-optional">任意</span></label>
    <div className="location-search">
      <div className="location-search-row"><input id={id} type="search" value={query} maxLength={160} disabled={disabled} placeholder="市区町村名を入力（例：渋谷、札幌）" aria-describedby={`${id}-help`} onChange={event => { selectedQuery.current = null; setOverride(event.target.value); if (value) onChange(null); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void find(query); } }} /><button className="admin-secondary" type="button" disabled={disabled || pending || query.trim().length < 2} onClick={() => void find(query)}>{pending ? "検索中…" : "再検索"}</button></div>
      <p className="admin-field-hint" id={`${id}-help`}>地名を入力すると候補が出ます。候補を1つ選び、「景色を登録」または「変更を保存」で登録してください。</p>
      {value && <div className="location-selection"><p role="status">登録する地点：{value.name}</p><button className="admin-text-button" type="button" disabled={disabled} onClick={() => { selectedQuery.current = null; setOverride(""); setSearch(null); onChange(null); }}>地点を外す</button></div>}
      {!value && <p className="admin-field-hint">地点はまだ選択されていません。タイトルから推測した検索語も、自由に変更できます。</p>}
      {pending && <p className="admin-field-hint" role="status">地点の候補を探しています…</p>}
      {search?.query === query && search.error && <p className="admin-error" role="alert">{search.error}</p>}
      {!value && search?.query === query && search.candidates && !search.error && (search.candidates.length ? <ul className="location-candidates" aria-label="地点の候補">{search.candidates.map(candidate => <li key={`${candidate.latitude},${candidate.longitude}`}><button type="button" disabled={disabled} onClick={() => choose(candidate)}>{candidate.name}<small>この地点を選択 · {candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}</small></button></li>)}</ul> : <p className="admin-field-hint" role="status">候補がありません。近くの市区町村名で検索してください。</p>)}
      <p className="admin-field-hint">天気用の代表地点です。住所や施設名より市区町村名で探せます。出典：<a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a> / <a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noopener noreferrer">Open-Meteo</a></p>
    </div>
  </section>;
}
