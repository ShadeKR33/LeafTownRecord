"use client";

import type { LimitedTitle } from "@/lib/types";
import { getLimitedTitleDef } from "@/lib/limitedTitles";

interface LimitedTitleBadgeProps {
  title: LimitedTitle;
}

export function LimitedTitleBadge({ title }: LimitedTitleBadgeProps) {
  const def = getLimitedTitleDef(title.id);
  if (!def) return null;

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
      {def.icon} {def.name}
    </span>
  );
}
