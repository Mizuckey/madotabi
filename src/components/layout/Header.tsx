import Link from "next/link";

export function Header() {
  return (
    <header className="app-header">
      <Link className="brand" href="/" aria-label="SORAMIRU ホーム">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M3 17a11 11 0 0 1 22 0M7 17a7 7 0 0 1 14 0M11 17a3 3 0 0 1 6 0M3 22h22" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>SORAMIRU</span>
      </Link>
      <span className="header-caption">日々のそばに、日本の景色。</span>
      <div className="header-actions" aria-label="今後追加する機能">
        <span className="preview-badge">DEVELOPMENT PREVIEW</span>
        <button disabled title="設定は今後実装予定" className="icon-button" aria-label="設定（未実装）">⚙</button>
        <button disabled title="全画面表示は今後実装予定" className="icon-button" aria-label="全画面表示（未実装）">⛶</button>
      </div>
    </header>
  );
}
