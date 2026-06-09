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
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="min-h-full flex flex-col relative" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {/* 상단 얇은 초록 글로우 라인 */}
        <div className="fixed top-0 left-0 right-0 h-1 z-50 shadow-[0_0_12px_rgba(76,175,80,0.8)]" style={{ background: "var(--accent-light)" }}></div>

        {/* 잎사귀 배경 장식 (미묘하게 떠다니는 애니메이션) */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-20 left-[10%] text-3xl leaf-float opacity-30 select-none" style={{ animationDelay: '0s' }}>🍃</div>
          <div className="absolute top-40 right-[15%] text-4xl leaf-float opacity-20 select-none" style={{ animationDelay: '1s' }}>🍃</div>
          <div className="absolute top-3/4 left-[20%] text-2xl leaf-float opacity-30 select-none" style={{ animationDelay: '2s' }}>🍃</div>
          <div className="absolute top-1/2 right-[5%] text-5xl leaf-float opacity-10 select-none" style={{ animationDelay: '0.5s' }}>🍃</div>
          <div className="absolute bottom-20 right-[25%] text-3xl leaf-float opacity-20 select-none" style={{ animationDelay: '1.5s' }}>🍃</div>
          <div className="absolute bottom-16 left-[8%] text-2xl leaf-float opacity-25 select-none" style={{ animationDelay: '2.5s' }}>🍃</div>
        </div>


        <SessionProvider>
          <Navigation />
          <main className="flex-1 relative">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
