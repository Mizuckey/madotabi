import { weatherLabel } from "@/lib/weather";

const cloud = "M6 17a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 16 8a4.5 4.5 0 0 1 1.5 9H6Z";

export function WeatherIcon({ code }: { code: number }) {
  const label = weatherLabel(code);
  let drawing;
  if (code === 0 || code === 1) {
    drawing = <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>;
  } else if (code === 2) {
    drawing = <><circle cx="7" cy="7" r="3.5" /><path d="M7 1v1M1 7h1m1-4 1 1m7-1-1 1" /><path d="M8 19a4 4 0 0 1-.5-8A5 5 0 0 1 17 11a4 4 0 0 1 .5 8H8Z" /></>;
  } else if (code === 3) {
    drawing = <path d={cloud} />;
  } else if (code === 45 || code === 48) {
    drawing = <path d="M4 6h16M2 10h17M5 14h17M3 18h16" />;
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    drawing = <><path d={cloud} /><path d="M7 20v3m-1.5-1.5h3M16 20v3m-1.5-1.5h3" /></>;
  } else if ([95, 96, 97, 99].includes(code)) {
    drawing = <><path d={cloud} /><path d="m13 17-3 4h4l-2 3" /></>;
  } else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    drawing = <><path d={cloud} /><path d="m7 20-1 2m6-2-1 2m6-2-1 2" /></>;
  } else {
    drawing = <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2.5m0 3v.1" /></>;
  }
  return <span className="weather-symbol" title={label}>
    <svg viewBox="0 0 24 26" width="20" height="22" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawing}</svg>
    <span className="sr-only">{label}</span>
  </span>;
}
