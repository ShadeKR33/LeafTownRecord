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

// ── FINAL MVP 트로피: 보라 크리스탈 크라운 ────────────────────────────────────
function FinalMvpTrophyIcon({ size = 13, uid }: { size?: number; uid: string }) {
  return (
    <svg viewBox="0 0 20 22" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}mvpSp`} x1="10" y1="0" x2="10" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ddd6fe" />
          <stop offset="25%"  stopColor="#7c3aed" />
          <stop offset="65%"  stopColor="#4338ca" />
          <stop offset="100%" stopColor="#2e1f6e" />
        </linearGradient>
        <linearGradient id={`${uid}mvpBs`} x1="10" y1="16" x2="10" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#2e1f6e" />
          <stop offset="100%" stopColor="#0a081e" />
        </linearGradient>
        <linearGradient id={`${uid}mvpRg`} x1="0" y1="0" x2="20" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#c4b5fd" stopOpacity="0" />
          <stop offset="30%"  stopColor="#c4b5fd" stopOpacity="0.95" />
          <stop offset="70%"  stopColor="#a78bfa" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 육각 받침 */}
      <path d="M3.5 21 L16.5 21 L18.5 18 L16.5 15.5 L3.5 15.5 L1.5 18 Z" fill={`url(#${uid}mvpBs)`} />
      <path d="M3.5 21 L16.5 21 L18.5 18" stroke="#7c3aed" strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.8" />
      <line x1="10" y1="15.5" x2="10" y2="21" stroke="#7c3aed" strokeWidth="0.3" opacity="0.4" />
      <line x1="7"  y1="15.5" x2="3.5" y2="21" stroke="#4c1d95" strokeWidth="0.2" opacity="0.3" />
      <line x1="13" y1="15.5" x2="16.5" y2="21" stroke="#4c1d95" strokeWidth="0.2" opacity="0.3" />
      {/* 왼쪽 파편 */}
      <path d="M7 4.5 L4.2 8.5 L4.5 13.5 L7 15.5 L7.5 9 Z" fill="#a5b4fc" opacity="0.72" />
      <path d="M7 4.5 L5.5 7 L7.5 9 Z" fill="white" opacity="0.35" />
      {/* 오른쪽 파편 */}
      <path d="M13 4.5 L15.8 8.5 L15.5 13.5 L13 15.5 L12.5 9 Z" fill="#c7d2fe" opacity="0.68" />
      <path d="M13 4.5 L14.5 7 L12.5 9 Z" fill="white" opacity="0.3" />
      {/* 메인 스파이어 */}
      <path d="M10 0.5 L13.5 5 L14 12 L12 15.5 L8 15.5 L6 12 L6.5 5 Z" fill={`url(#${uid}mvpSp)`} />
      {/* 왼쪽 면 하이라이트 */}
      <path d="M10 0.5 L6.5 5 L6 12 L10 9 Z" fill="#ddd6fe" opacity="0.2" />
      {/* 상단 패싯 */}
      <path d="M10 0.5 L12.5 4.5 L10 6 L7.5 4.5 Z" fill="#e9d5ff" opacity="0.5" />
      {/* 반짝임 (WorldsTrophyIcon 동일 스타일) */}
      <line x1="8.2" y1="2.5" x2="9" y2="5" stroke="white" strokeWidth="0.9" opacity="0.7" strokeLinecap="round" />
      {/* 첨탑 끝 */}
      <circle cx="10" cy="0.7" r="0.55" fill="white" opacity="0.95" />
      {/* 왕관 아이콘 */}
      <path d="M7.5 11 L8.1 8 L9.2 9.9 L10 7.5 L10.8 9.9 L11.9 8 L12.5 11 Z" fill="white" opacity="0.82" />
      <rect x="7.5" y="10.8" width="5" height="0.75" rx="0.2" fill="white" opacity="0.45" />
      {/* 오빗 링 */}
      <ellipse cx="10" cy="12.8" rx="5.8" ry="1.1" fill="none" stroke={`url(#${uid}mvpRg)`} strokeWidth="0.65" />
      {/* 스파클 */}
      <path d="M3 3.5 L3.3 4.8 L3 6.1 L2.7 4.8 Z M1.7 4.8 L3 5.1 L4.3 4.8 L3 4.5 Z" fill="#a78bfa" opacity="0.9" />
      <path d="M17 7 L17.3 8.2 L17 9.4 L16.7 8.2 Z M15.8 8.2 L17 8.5 L18.2 8.2 L17 7.9 Z" fill="#818cf8" opacity="0.85" />
    </svg>
  );
}

// ── 스타일 정의 ──────────────────────────────────────────────────────────────
const RANK_STYLE: Record<1 | 2 | 3, { bg: string; border: string; color: string }> = {
  1: { bg: "rgba(251,191,36,0.18)",  border: "#fbbf24", color: "#92400e" },
  2: { bg: "rgba(148,163,184,0.18)", border: "#94a3b8", color: "#334155" },
  3: { bg: "rgba(180,83,9,0.15)",    border: "#c2410c", color: "#7c2d12" },
};
const WORLDS_STYLE = { bg: "rgba(0,229,255,0.13)",   border: "#00e5ff", color: "#006080" };
const MVP_STYLE    = { bg: "rgba(109,40,217,0.18)",  border: "#7c3aed", color: "#4c1d95" };

// ── TrophyIcon 디스패처 ──────────────────────────────────────────────────────
function TrophyIcon({
  trophy, size = 13, uid,
}: { trophy: SeasonTrophy; size?: number; uid: string }) {
  if (trophy.type === "worlds-mvp") return <FinalMvpTrophyIcon size={Math.round(size * 1.15)} uid={uid} />;
  if (trophy.type === "worlds")     return <WorldsTrophyIcon   size={Math.round(size * 1.15)} uid={uid} />;
  if (trophy.rank === 1)            return <GoldTrophyIcon     size={size} uid={uid} />;
  if (trophy.rank === 2)            return <SilverTrophyIcon   size={size} uid={uid} />;
  return                                   <BronzeTrophyIcon   size={size} uid={uid} />;
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
  const isMvp    = trophy.type === "worlds-mvp";
  const isWorlds = trophy.type === "worlds";
  const s = isMvp ? MVP_STYLE : isWorlds ? WORLDS_STYLE : RANK_STYLE[trophy.rank];
  const label = isMvp
    ? `${trophy.seasonLabel} FINAL MVP`
    : isWorlds
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
            {isMvp ? "MVP" : isWorlds ? "월즈" : `${trophy.rank}위`}
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
  const isMvp    = trophy.type === "worlds-mvp";
  const isWorlds = trophy.type === "worlds";
  const s = isMvp ? MVP_STYLE : isWorlds ? WORLDS_STYLE : RANK_STYLE[trophy.rank];
  const label = isMvp
    ? `${trophy.seasonLabel} FINAL MVP`
    : isWorlds
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
    const typeOrder = (t: SeasonTrophy) => {
      if (t.type === "worlds-mvp") return -1;
      if (t.type === "worlds")     return 0;
      return t.rank;
    };
    const tr = typeOrder(a) - typeOrder(b);
    if (tr !== 0) return tr;
    return b.season.localeCompare(a.season);
  });
}

// ── TrophyShowcase: 큰 트로피 카드 목록 (개요 탭용) ─────────────────────────
export function TrophyShowcase({ trophies }: { trophies: SeasonTrophy[] }) {
  if (!trophies || trophies.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 items-end">
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
    <span className="inline-flex flex-wrap gap-1 items-end">
      {sorted.map((t, i) => (
        <TrophyBadge key={`${t.season}-${t.rank}-${i}`} trophy={t} iconOnly={iconOnly} />
      ))}
    </span>
  );
}
