"use client";

import { useEffect, useState } from "react";
import type { LimitedTitle } from "@/lib/types";
import { getLimitedTitleDef } from "@/lib/limitedTitles";

interface LimitedTitleBadgeProps {
  title: LimitedTitle;
}

export function useIsDarkTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => {
      const val = getComputedStyle(document.documentElement)
        .getPropertyValue("--theme-is-dark")
        .trim();
      setIsDark(val === "1");
    };
    check();
    // html 클래스 변경 감지 (드롭다운 테마 변경 포함)
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("themechange", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("themechange", check);
    };
  }, []);

  return isDark;
}

export function LimitedTitleBadge({ title }: LimitedTitleBadgeProps) {
  const def = getLimitedTitleDef(title.id);
  const isDark = useIsDarkTheme();
  if (!def) return null;

  const icon = isDark && def.darkIcon ? def.darkIcon : def.icon;

  return (
    <span
      className="inline-flex items-center gap-1 select-none"
      style={{
        background: `linear-gradient(var(--panel), var(--panel)) padding-box,
                     linear-gradient(135deg, ${def.color}, ${def.accentColor}) border-box`,
        border: "1px solid transparent",
        borderRadius: "6px",
        padding: "1px 7px",
        fontSize: "11px",
        fontWeight: 800,
        color: def.color,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
      }}
    >
      {icon} {def.name}
    </span>
  );
}
