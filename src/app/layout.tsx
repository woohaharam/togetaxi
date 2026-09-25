import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/site";
import "./globals.css";

const DESCRIPTION = "같은 방향 가는 대학생끼리 택시를 같이 타고 요금을 나눠 내요. 학교 메일로 인증한 학생만, 수수료 없이.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: "같이타 · 대학생 택시 같이 타기",
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "같이타", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "같이타",
    title: "같이타 · 같은 방향이면 택시비는 나눠 내요",
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "같이타" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffc629",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <div className="mx-auto min-h-dvh max-w-md bg-zinc-50 shadow-sm">{children}</div>
      </body>
    </html>
  );
}
