"use client";

import { useEffect, useState } from "react";
import type { LimitedTitle } from "@/lib/types";
import { getLimitedTitleDef, type LimitedTitleDef } from "@/lib/limitedTitles";

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

// 이미지가 있으면 <img>, 없으면 이모지 fallback
export function LimitedTitleIcon({
  def,
  size = 22,
  isDark = false,
  className,
}: {
  def: LimitedTitleDef;
  size?: number;
  isDark?: boolean;
  className?: string;
}) {
  if (def.image) {
    return (
      <img
        src={`/images/achievements/${def.image}`}
        alt={def.name}
        width={size}
        height={size}
        className={className}
        style={{ objectFit: "contain", flexShrink: 0 }}
      />
    );
  }
  const emoji = isDark && def.darkIcon ? def.darkIcon : def.icon;
  return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{emoji}</span>;
}

export function LimitedTitleBadge({ title }: LimitedTitleBadgeProps) {
  const def = getLimitedTitleDef(title.id);
  const isDark = useIsDarkTheme();
  if (!def) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 select-none"
      style={{
        background: `linear-gradient(var(--panel), var(--panel)) padding-box,
                     linear-gradient(135deg, ${def.color}, ${def.accentColor}) border-box`,
        border: "1px solid transparent",
        borderRadius: "6px",
        padding: "2px 7px 2px 4px",
        fontSize: "11px",
        fontWeight: 800,
        color: def.color,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
      }}
    >
      <LimitedTitleIcon def={def} size={18} isDark={isDark} />
      {def.name}
    </span>
  );
}
