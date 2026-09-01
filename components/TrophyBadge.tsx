"use client";

import { useState } from "react";
import type { SeasonTrophy } from "@/lib/types";

const RANK_STYLE: Record<1 | 2 | 3, { bg: string; border: string; color: string; fill: string; shine: string }> = {
  1: { bg: "rgba(251,191,36,0.18)", border: "#fbbf24", color: "#92400e", fill: "#f59e0b", shine: "#fde68a" },
  2: { bg: "rgba(148,163,184,0.18)", border: "#94a3b8", color: "#334155", fill: "#94a3b8", shine: "#e2e8f0" },
  3: { bg: "rgba(180,83,9,0.15)",   border: "#c2410c", color: "#7c2d12", fill: "#ea580c", shine: "#fed7aa" },
};

function TrophyIcon({ fill, shine, size = 13 }: { fill: string; shine: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 22" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 손잡이 */}
      <path d="M6 4H3a2.5 2.5 0 000 5h3" stroke={fill} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M14 4h3a2.5 2.5 0 010 5h-3" stroke={fill} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* 컵 몸체 */}
      <path d="M6 2h8v8a4 4 0 01-8 0V2z" fill={fill} />
      {/* 광택 */}
      <path d="M8 3.5c0 0 1-0.3 2 0" stroke={shine} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      {/* 기둥 */}
      <rect x="9" y="10" width="2" height="4" rx="0.5" fill={fill} />
      {/* 받침 */}
      <rect x="6" y="14" width="8" height="2" rx="1" fill={fill} />
      {/* 받침 광택 */}
      <rect x="7" y="14.6" width="4" height="0.6" rx="0.3" fill={shine} opacity="0.5" />
    </svg>
  );
}

interface TrophyBadgeProps {
  trophy: SeasonTrophy;
}

export function TrophyBadge({ trophy }: TrophyBadgeProps) {
  const s = RANK_STYLE[trophy.rank];
  const label = `${trophy.seasonLabel} ${trophy.rank}위`;
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <span className="inline-flex items-center">
      <span
        className="inline-flex items-center gap-0.5 cursor-default select-none"
        style={{
          background: s.bg,
          border: `1px solid ${s.border}`,
          borderRadius: "6px",
          padding: "1px 6px",
          fontSize: "11px",
          fontWeight: 700,
          color: s.color,
          lineHeight: 1.6,
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ x: r.left + r.width / 2, y: r.top });
        }}
        onMouseLeave={() => setPos(null)}
      >
        <TrophyIcon fill={s.fill} shine={s.shine} />
        <span style={{ marginLeft: 3 }}>{trophy.rank}위</span>
      </span>

      {pos && (
        <span
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: pos.x,
            top: pos.y - 8,
            transform: "translate(-50%, -100%)",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "4px 10px",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text)",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {label}
          <span
            className="absolute left-1/2 -translate-x-1/2 top-full"
            style={{
              width: 0, height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid var(--border)",
            }}
          />
        </span>
      )}
    </span>
  );
}

export function TrophyList({ trophies }: { trophies: SeasonTrophy[] }) {
  if (!trophies || trophies.length === 0) return null;
  const sorted = [...trophies].sort((a, b) => b.season.localeCompare(a.season));
  return (
    <span className="inline-flex flex-wrap gap-1">
      {sorted.map(t => <TrophyBadge key={`${t.season}-${t.rank}`} trophy={t} />)}
    </span>
  );
}
