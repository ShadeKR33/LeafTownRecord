"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GuideBannerProps {
  pageKey: string;
  icon: string;
  title: string;
  items: string[];
  guideAnchor?: string;
}

export default function GuideBanner({ pageKey, icon, title, items, guideAnchor }: GuideBannerProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(`guide-${pageKey}`)) setVisible(true);
  }, [pageKey]);

  function dismiss() {
    setClosing(true);
    setTimeout(() => {
      localStorage.setItem(`guide-${pageKey}`, "1");
      setVisible(false);
    }, 300);
  }

  if (!visible) return null;

  return (
    <div
      className="mb-6 rounded-2xl overflow-hidden"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        opacity: closing ? 0 : 1,
        transform: closing ? "translateY(-8px)" : "translateY(0)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="text-2xl mt-0.5 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm mb-2" style={{ color: "var(--accent)" }}>{title}</p>
          <ul className="flex flex-col gap-1">
            {items.map((item, i) => (
              <li key={i} className="text-xs flex items-start gap-2" style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "var(--accent)", marginTop: 1 }}>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-xs transition-all hover:scale-110"
          style={{ color: "var(--text-dim)", background: "var(--hover)" }}
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
      <div className="px-5 pb-3 flex items-center gap-4">
        <button
          onClick={dismiss}
          className="text-xs underline"
          style={{ color: "var(--text-dim)" }}
        >
          다시 보지 않기
        </button>
        {guideAnchor && (
          <Link
            href={`/guide#${guideAnchor}`}
            className="text-xs font-bold transition-all hover:opacity-80"
            style={{ color: "var(--accent)" }}
          >
            자세히 보기 →
          </Link>
        )}
      </div>
    </div>
  );
}
