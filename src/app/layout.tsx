import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "窓旅",
  title: "窓旅 | 日々のそばに、日本の景色。",
  description: "日本各地のYouTubeライブカメラを、作業中のそばに。窓旅で、いつもの時間にちがう景色を。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
