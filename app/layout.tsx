import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "나뭇잎 마을 내전 기록소 (상급닌자 제1시험)",
  description: "나뭇잎 마을 친구들의 내전 기록을 관리하는 사이트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      {/* 테마 클래스를 hydration 전에 즉시 적용 — 테마 깜빡임 방지 */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('theme');
              if (t === 'rain') document.documentElement.classList.add('ame-mode');
              if (t === 'aka')  document.documentElement.classList.add('aka-mode');
              if (t === 'sand') document.documentElement.classList.add('sand-mode');
              if (t === 'cloud') document.documentElement.classList.add('cloud-mode');
              if (t === 'hideout') document.documentElement.classList.add('hideout-mode');
              if (t === 'myoboku') document.documentElement.classList.add('myoboku-mode');
              if (t === 'anbu') document.documentElement.classList.add('anbu-mode');
              if (t === 'orochimaru') document.documentElement.classList.add('orochimaru-mode');
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="min-h-full flex flex-col relative" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {/* 상단 얇은 초록 글로우 라인 */}
        <div className="fixed top-0 left-0 right-0 h-1 z-50 shadow-[0_0_12px_rgba(76,175,80,0.8)]" style={{ background: "var(--accent-light)" }}></div>


        <SessionProvider>
          <Navigation />
          <main className="flex-1 relative">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
