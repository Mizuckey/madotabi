import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SORAMIRU | 日々のそばに、日本の景色。",
  description: "日本各地のライブカメラを、作業中のそばに。SORAMIRUの開発用プレビューです。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
