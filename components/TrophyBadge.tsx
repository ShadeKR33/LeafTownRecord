"use client";

import { useState, useId } from "react";
import type { SeasonTrophy } from "@/lib/types";

// ── 월즈 트로피: 크리스탈 첨탑 스타일, 시안 계열 ──────────────────────────
function WorldsTrophyIcon({ size = 13, uid }: { size?: number; uid: string }) {
  return (
    <svg viewBox="0 0 20 22" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}wg`} x1="10" y1="1" x2="10" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="55%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      {/* 크리스탈 첨탑 — 폭 넓힘 */}
      <polygon points="10,0.5 14,5.5 10,8 6,5.5" fill="#cffafe" />
      {/* 컵 몸체 — 더 넓은 육각형 패싯 */}
      <path d="M6,8 L3.5,12.5 L5,17 L15,17 L16.5,12.5 L14,8 Z" fill={`url(#${uid}wg)`} />
      {/* 내부 하이라이트 면 */}
      <path d="M9.5,9.5 L7.5,13 L8.5,15.5 L11.5,15.5 L12.5,13 L10.5,9.5 Z" fill="#67e8f9" opacity="0.3" />
      {/* 기둥 */}
      <rect x="9" y="17" width="2" height="2" rx="0.6" fill="#0891b2" />
      {/* 받침 */}
      <rect x="5" y="19" width="10" height="2" rx="1" fill="#0e7490" />
      {/* 받침 광택 */}
      <rect x="6" y="19.5" width="5" height="0.7" rx="0.35" fill="#a5f3fc" opacity="0.5" />
      {/* 크리스탈 반짝임 */}
      <line x1="8.2" y1="2.5" x2="9.2" y2="5" stroke="white" strokeWidth="1" opacity="0.75" strokeLinecap="round" />
    </svg>
  );
}

// ── 시즌 1위 트로피: 황금 왕관형 ────────────────────────────────────────────
function GoldTrophyIcon({ size = 13, uid }: { size?: number; uid: string }) {
  return (
    <svg viewBox="0 0 20 22" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}gg`} x1="10" y1="2" x2="10" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      {/* 왕관 형태 상단 — 3개 포인트 */}
      <polyline points="5,6 7,3 10,5.5 13,3 15,6" stroke="#fde68a" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* 손잡이 */}
      <path d="M7,6 C5,6.5 4,9 5.5,10.5 L7,10" stroke="#d97706" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M13,6 C15,6.5 16,9 14.5,10.5 L13,10" stroke="#d97706" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* 컵 몸체 */}
      <path d="M7,6 L6,11.5 Q6,15.5 10,15.5 Q14,15.5 14,11.5 L13,6 Z" fill={`url(#${uid}gg)`} />
      {/* 광택 */}
      <path d="M8.5,7.5 Q9.2,6.8 10.2,7.2" stroke="#fef3c7" strokeWidth="1.1" fill="none" opacity="0.7" strokeLinecap="round" />
      {/* 기둥 */}
      <rect x="9" y="15.5" width="2" height="3.5" rx="0.6" fill="#b45309" />
      {/* 받침 */}
      <rect x="6" y="19" width="8" height="2" rx="1" fill="#92400e" />
      {/* 받침 광택 */}
      <rect x="7" y="19.4" width="4" height="0.7" rx="0.35" fill="#fde68a" opacity="0.45" />
    </svg>
  );
}

// ── 시즌 2위 트로피: 은빛 구형 돔 ─────────────────────────────────────────
function SilverTrophyIcon({ size = 13, uid }: { size?: number; uid: string }) {
  return (
    <svg viewBox="0 0 20 22" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}sg`} x1="10" y1="1.5" x2="10" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      {/* 상단 구체/돔 */}
      <circle cx="10" cy="5" r="3.5" fill="#e2e8f0" />
      <circle cx="9" cy="4" r="1.2" fill="white" opacity="0.5" />
      {/* 손잡이 */}
      <path d="M7,7.5 C5.2,8 4.5,10.5 6,12 L7,11.5" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M13,7.5 C14.8,8 15.5,10.5 14,12 L13,11.5" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* 컵 몸체 */}
      <path d="M7,7.5 L6.5,12.5 Q6.5,16 10,16 Q13.5,16 13.5,12.5 L13,7.5 Z" fill={`url(#${uid}sg)`} />
      {/* 광택 */}
      <path d="M8.2,9.5 Q9,8.8 10,9.2" stroke="white" strokeWidth="1" fill="none" opacity="0.6" strokeLinecap="round" />
      {/* 기둥 */}
      <rect x="9" y="16" width="2" height="3" rx="0.6" fill="#64748b" />
      {/* 받침 */}
      <rect x="6.5" y="19" width="7" height="2" rx="1" fill="#475569" />
      {/* 받침 광택 */}
      <rect x="7.5" y="19.4" width="3" height="0.7" rx="0.35" fill="#f1f5f9" opacity="0.4" />
    </svg>
  );
}

// ── 시즌 3위 트로피: 청동 클래식 컵 ──────────────────────────────────────
function BronzeTrophyIcon({ size = 13, uid }: { size?: number; uid: string }) {
  return (
    <svg viewBox="0 0 20 22" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}bg`} x1="10" y1="2" x2="10" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="55%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
      </defs>
      {/* 손잡이 */}
      <path d="M7,5 C5,5.5 4.2,8.5 5.8,10 L7,9.5" stroke="#c2410c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M13,5 C15,5.5 15.8,8.5 14.2,10 L13,9.5" stroke="#c2410c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* 컵 몸체 */}
      <path d="M7,3.5 L6.5,10.5 Q6.5,15 10,15 Q13.5,15 13.5,10.5 L13,3.5 Z" fill={`url(#${uid}bg)`} />
      {/* 광택 */}
      <path d="M8.5,5.5 Q9.3,4.8 10.3,5.2" stroke="#fff7ed" strokeWidth="1.1" fill="none" opacity="0.65" strokeLinecap="round" />
      {/* 기둥 */}
      <rect x="9" y="15" width="2" height="4" rx="0.6" fill="#9a3412" />
      {/* 받침 */}
      <rect x="6.5" y="19" width="7" height="2" rx="1" fill="#7c2d12" />
      {/* 받침 광택 */}
      <rect x="7.5" y="19.4" width="3" height="0.7" rx="0.35" fill="#fed7aa" opacity="0.4" />
    </svg>
  );
}

// ── 스타일 정의 ──────────────────────────────────────────────────────────────
const RANK_STYLE: Record<1 | 2 | 3, { bg: string; border: string; color: string }> = {
  1: { bg: "rgba(251,191,36,0.18)",  border: "#fbbf24", color: "#92400e" },
  2: { bg: "rgba(148,163,184,0.18)", border: "#94a3b8", color: "#334155" },
  3: { bg: "rgba(180,83,9,0.15)",    border: "#c2410c", color: "#7c2d12" },
};
const WORLDS_STYLE = { bg: "rgba(0,229,255,0.13)", border: "#00e5ff", color: "#006080" };

// ── TrophyIcon 디스패처 ──────────────────────────────────────────────────────
function TrophyIcon({
  trophy, size = 13, uid,
}: { trophy: SeasonTrophy; size?: number; uid: string }) {
  if (trophy.type === "worlds") return <WorldsTrophyIcon size={Math.round(size * 1.15)} uid={uid} />;
  if (trophy.rank === 1)        return <GoldTrophyIcon   size={size} uid={uid} />;
  if (trophy.rank === 2)        return <SilverTrophyIcon size={size} uid={uid} />;
  return                               <BronzeTrophyIcon size={size} uid={uid} />;
}

// ── TrophyBadge: 배지 + 호버 툴팁 ───────────────────────────────────────────
interface TrophyBadgeProps {
  trophy: SeasonTrophy;
  size?: number;
  iconOnly?: boolean;
}

export function TrophyBadge({ trophy, size = 13, iconOnly = false }: TrophyBadgeProps) {
  const rawUid = useId();
  const uid = rawUid.replace(/:/g, "");
  const isWorlds = trophy.type === "worlds";
  const s = isWorlds ? WORLDS_STYLE : RANK_STYLE[trophy.rank];
  const label = isWorlds
    ? `${trophy.seasonLabel} 우승`
    : `${trophy.seasonLabel} ${trophy.rank}위`;
  const [hovered, setHovered] = useState(false);

  const iconSize = iconOnly ? 20 : size;

  return (
    <span
      className="inline-flex items-center"
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="inline-flex items-center gap-0.5 cursor-default select-none"
        style={iconOnly ? {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px",
          filter: `drop-shadow(0 1px 3px ${s.border}88)`,
        } : {
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
      >
        <TrophyIcon trophy={trophy} size={iconSize} uid={uid} />
        {!iconOnly && (
          <span style={{ marginLeft: 3 }}>
            {isWorlds ? "월즈" : `${trophy.rank}위`}
          </span>
        )}
      </span>

      {hovered && (
        <span
          className="pointer-events-none z-[9999]"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
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
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
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

// ── TrophyCard: 큰 트로피 카드 단위 (개요 탭용) ────────────────────────────
function TrophyCard({ trophy }: { trophy: SeasonTrophy }) {
  const rawUid = useId();
  const uid = rawUid.replace(/:/g, "");
  const isWorlds = trophy.type === "worlds";
  const s = isWorlds ? WORLDS_STYLE : RANK_STYLE[trophy.rank];
  const label = isWorlds
    ? `${trophy.seasonLabel} 우승`
    : `${trophy.seasonLabel} ${trophy.rank}위`;
  return (
    <div
      className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl"
      style={{ background: s.bg, border: `1.5px solid ${s.border}`, minWidth: 72 }}
    >
      <TrophyIcon trophy={trophy} size={32} uid={uid} />
      <span className="text-[11px] font-bold text-center leading-tight" style={{ color: s.color }}>
        {label}
      </span>
    </div>
  );
}

function sortTrophies(trophies: SeasonTrophy[]) {
  return [...trophies].sort((a, b) => {
    const typeRank = (t: SeasonTrophy) => t.type === "worlds" ? 0 : t.rank;
    const tr = typeRank(a) - typeRank(b);
    if (tr !== 0) return tr;
    return b.season.localeCompare(a.season);
  });
}

// ── TrophyShowcase: 큰 트로피 카드 목록 (개요 탭용) ─────────────────────────
export function TrophyShowcase({ trophies }: { trophies: SeasonTrophy[] }) {
  if (!trophies || trophies.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {sortTrophies(trophies).map((t, i) => (
        <TrophyCard key={`${t.season}-${t.rank}-${i}`} trophy={t} />
      ))}
    </div>
  );
}

// ── TrophyList: 작은 배지 목록 ──────────────────────────────────────────────
export function TrophyList({ trophies, iconOnly = true }: { trophies: SeasonTrophy[]; iconOnly?: boolean }) {
  if (!trophies || trophies.length === 0) return null;
  const sorted = sortTrophies(trophies);
  return (
    <span className="inline-flex flex-wrap gap-1 items-center">
      {sorted.map((t, i) => (
        <TrophyBadge key={`${t.season}-${t.rank}-${i}`} trophy={t} iconOnly={iconOnly} />
      ))}
    </span>
  );
}
