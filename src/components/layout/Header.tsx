import Link from "next/link";

export function Header() {
  return (
    <header className="app-header">
      <Link className="brand" href="/" aria-label="窓旅 ホーム">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M3 17a11 11 0 0 1 22 0M7 17a7 7 0 0 1 14 0M11 17a3 3 0 0 1 6 0M3 22h22" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>窓旅</span>
      </Link>
      <span className="header-caption">日々のそばに、日本の景色。</span>

    </header>
  );
}
