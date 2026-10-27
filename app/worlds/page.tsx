"use client";

import { useState, useEffect } from "react";
import { computePlayerStats, loadGameRecords, loadNicknames } from "@/lib/stats";
import { computeGameAwards } from "@/lib/awards";
import type { NicknameEntry, PlayerStats, GameRecord } from "@/lib/types";

type Tab = "dday" | "draft" | "players" | "guide" | "scrim" | "journey";

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "dday",    icon: "⏳", label: "디데이"  },
  { key: "draft",   icon: "⚔️", label: "드래프트" },
  { key: "players", icon: "🃏", label: "선수단"   },
  { key: "scrim",   icon: "📊", label: "스크림"   },
  { key: "guide",   icon: "📖", label: "가이드"   },
  { key: "journey", icon: "🗺️", label: "여정"    },
];

// ─── D-Day 탭 ────────────────────────────────────────────────────────────────

function DDayTab() {
  const TARGET_DATE = "2026-12-28";

  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const target = new Date(TARGET_DATE + "T00:00:00");
  const diff = target.getTime() - now.getTime();
  const isPast = diff <= 0;

  const totalSeconds = isPast ? 0 : Math.floor(diff / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  const targetLabel = target.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      {/* 이벤트 이름 */}
      <div className="text-center">
        <div className="text-5xl mb-3">🏆</div>
        <p className="text-xs font-bold tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>
          THE 2ND KONOHA WORLDS
        </p>
        <h2 className="text-2xl font-black leading-snug" style={{ color: "var(--accent)" }}>
          제2회 나뭇잎 마을<br />월드 챔피언십
        </h2>
        <div className="flex items-center justify-center gap-3 mt-3 text-xs" style={{ color: "var(--text-dim)" }}>
          <span>📍 여수시</span>
          <span>·</span>
          <span>🗓️ 12월 28일 ~ 30일</span>
          <span>·</span>
          <span>👥 12명</span>
        </div>
      </div>

      {/* 디데이 카운트다운 */}
      <div className="w-full max-w-xl rounded-2xl p-8 text-center"
        style={{ background: "var(--panel)", border: "2px solid var(--accent)", boxShadow: "0 0 32px color-mix(in srgb, var(--accent) 20%, transparent)" }}>
        {isPast ? (
          <div>
            <p className="text-6xl font-black" style={{ color: "var(--accent)" }}>D+{Math.abs(Math.floor(diff / 86400000))}</p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>월즈가 시작됐습니다! 🎉</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold mb-4 tracking-widest" style={{ color: "var(--text-muted)" }}>
              UNTIL WORLDS
            </p>
            <div className="mb-4">
              <span className="font-black" style={{ fontSize: "clamp(64px, 18vw, 120px)", lineHeight: 1, color: "var(--accent)" }}>
                {days}
              </span>
              <span className="text-2xl font-bold ml-2" style={{ color: "var(--text-muted)" }}>일</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {[
                { value: pad(hours),   label: "시간" },
                { value: ":",          label: ""     },
                { value: pad(minutes), label: "분"   },
                { value: ":",          label: ""     },
                { value: pad(seconds), label: "초"   },
              ].map((item, i) => (
                item.value === ":" ? (
                  <span key={i} className="text-3xl font-black mb-3" style={{ color: "var(--text-dim)" }}>:</span>
                ) : (
                  <div key={i} className="text-center">
                    <div className="text-3xl font-black font-mono w-14 rounded-lg py-1"
                      style={{ background: "var(--hover)", color: "var(--text)" }}>
                      {item.value}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{item.label}</div>
                  </div>
                )
              ))}
            </div>
          </>
        )}
      </div>

      {/* 날짜 표시 */}
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>📅 {targetLabel}</p>
    </div>
  );
}

// ─── 드래프트 탭 ──────────────────────────────────────────────────────────────

type DraftTeam = "blue" | "red";
const DRAFT_STORAGE_KEY = "worlds_draft_v2";
const TEAM_COLOR: Record<DraftTeam, string> = { blue: "#3b82f6", red: "#ef4444" };
const WORLDS_COACHES = ["승주", "문강"];
const WORLDS_PAIRS = [
  { pos: "탑",   icon: "⚔️",  p1: "효근", p2: "한준" },
  { pos: "정글", icon: "🌲",  p1: "우빈", p2: "민수" },
  { pos: "미드", icon: "✨",  p1: "성빈", p2: "용욱" },
  { pos: "원딜", icon: "🎯",  p1: "서연", p2: "만슥" },
  { pos: "서폿", icon: "🛡️", p1: "성태", p2: "성찬" },
];
const WORLDS_PLAYERS = WORLDS_PAIRS.flatMap(p => [p.p1, p.p2]);

function matchEntry(name: string, nicks: NicknameEntry[]): NicknameEntry | undefined {
  const norm = (s: string) => s.replace(/\s/g, "");
  return nicks.find(n =>
    n.nickname === name || n.realName === name ||
    norm(n.nickname) === norm(name) || norm(n.realName || "") === norm(name) ||
    (n.altNicknames || []).some(a => norm(a) === norm(name))
  );
}

function getPosWR(name: string, stats: PlayerStats | undefined): number | null {
  if (!stats?.positionStats) return null;
  const pair = WORLDS_PAIRS.find(p => p.p1 === name || p.p2 === name);
  if (!pair) return null;
  const key = pair.pos === "서폿" ? "서포터" : pair.pos;
  const ps = stats.positionStats[key];
  return ps && ps.games > 0 ? ps.wins / ps.games : null;
}

const POSITION_KEYS = ["탑", "정글", "미드", "원딜", "서포터"];

function getPosChampions(entry: NicknameEntry, pos: string, recs: GameRecord[]): string[] {
  const normPos = pos === "서폿" ? "서포터" : pos;
  const posIdx = POSITION_KEYS.indexOf(normPos);
  if (posIdx === -1) return [];
  const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();
  const allNicks = new Set([
    norm(entry.nickname),
    ...(entry.altNicknames || []).map(a => norm(a)),
  ]);
  const matchNick = (n: string) => {
    const base = n.includes("#") ? n.split("#")[0] : n;
    return allNicks.has(norm(base)) || allNicks.has(norm(n));
  };
  const champCount: Record<string, number> = {};
  recs.forEach(r => {
    for (const team of [r.team1, r.team2]) {
      const player = team[posIdx];
      if (player && matchNick(player.nickname || "") && player.champion && player.champion !== "?") {
        champCount[player.champion] = (champCount[player.champion] || 0) + 1;
      }
    }
  });
  return Object.entries(champCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name);
}

function computePosMvpAce(entry: NicknameEntry, pos: string, recs: GameRecord[]): { mvp: number; ace: number } {
  const normPos = pos === "서폿" ? "서포터" : pos;
  const posIdx = POSITION_KEYS.indexOf(normPos);
  if (posIdx === -1) return { mvp: 0, ace: 0 };
  const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();
  const allNicks = new Set([norm(entry.nickname), ...(entry.altNicknames || []).map(a => norm(a))]);
  const matchNick = (n: string) => { const b = n.includes("#") ? n.split("#")[0] : n; return allNicks.has(norm(b)) || allNicks.has(norm(n)); };
  let mvp = 0, ace = 0;
  recs.forEach(r => {
    const inT1 = r.team1[posIdx] && matchNick(r.team1[posIdx].nickname || "");
    const inT2 = r.team2[posIdx] && matchNick(r.team2[posIdx].nickname || "");
    if (!inT1 && !inT2) return;
    const myTeam = inT1 ? 1 : 2;
    const awards = computeGameAwards(r.team1, r.team2, r.winTeam);
    if (!awards) return;
    if (awards.mvpTeam === myTeam && awards.mvpIndex === posIdx) mvp++;
    if (awards.aceTeam === myTeam && awards.aceIndex === posIdx) ace++;
  });
  return { mvp, ace };
}

function computePosChampPool(entry: NicknameEntry, pos: string, recs: GameRecord[]): number {
  const normPos = pos === "서폿" ? "서포터" : pos;
  const posIdx = POSITION_KEYS.indexOf(normPos);
  if (posIdx === -1) return 0;
  const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();
  const allNicks = new Set([norm(entry.nickname), ...(entry.altNicknames || []).map(a => norm(a))]);
  const matchNick = (n: string) => { const b = n.includes("#") ? n.split("#")[0] : n; return allNicks.has(norm(b)) || allNicks.has(norm(n)); };
  const champs = new Set<string>();
  recs.forEach(r => {
    for (const team of [r.team1, r.team2]) {
      const p = team[posIdx];
      if (p && matchNick(p.nickname || "") && p.champion && p.champion !== "?") champs.add(p.champion);
    }
  });
  return champs.size;
}

function calcOVR(name: string, stats: PlayerStats | undefined, posMvpAce?: { mvp: number; ace: number }, champPool?: number): {
  ovr: number; wrStat: number; kdaStat: number; mvpAceStat: number; champPoolStat: number;
} {
  const empty = { ovr: 60, wrStat: 60, kdaStat: 60, mvpAceStat: 60, champPoolStat: 60 };
  if (!stats || stats.totalGames === 0) return empty;
  const wr    = getPosWR(name, stats) ?? stats.winRate;
  const wrStat = Math.round(Math.min(99, 40 + wr * 55));
  const kda   = stats.kdaTotal && stats.kdaTotal.games > 0
    ? (stats.kdaTotal.kills + stats.kdaTotal.assists) / Math.max(stats.kdaTotal.deaths, 1) : 1.5;
  const kdaStat    = Math.round(Math.min(99, 50 + kda * 8));
  const total      = (posMvpAce?.mvp ?? stats.mvpCount ?? 0) + (posMvpAce?.ace ?? stats.aceCount ?? 0);
  const mvpAceStat = Math.round(Math.min(99, 60 + total * 6));
  const pool       = champPool ?? stats.topChampions?.length ?? 1;
  const champPoolStat = Math.round(Math.min(99, Math.max(50, 50 + pool * 5)));
  const ovr = Math.round(wrStat * 0.45 + kdaStat * 0.30 + mvpAceStat * 0.15 + champPoolStat * 0.10);
  return { ovr: Math.min(99, Math.max(50, ovr)), wrStat, kdaStat, mvpAceStat, champPoolStat };
}

function calcChemistry(team: string[], statsMap: Record<string, PlayerStats>): number | null {
  const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();
  const results: number[] = [];
  for (let i = 0; i < team.length; i++) {
    const s = statsMap[team[i]];
    if (!s) continue;
    for (let j = 0; j < team.length; j++) {
      if (i === j) continue;
      const e = Object.entries(s.withStats).find(([k]) => norm(k) === norm(team[j]));
      if (e && e[1].wins + e[1].losses > 0) results.push(e[1].wins / (e[1].wins + e[1].losses));
    }
  }
  return results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length * 100) : null;
}

// ─── 포지션 페어 카드 ──────────────────────────────────────────────────────────

function PairPlayerCard({ name, stats, team, blueLabel, redLabel, pos, onPick, onScout }: {
  name: string;
  stats?: PlayerStats;
  team: DraftTeam | null;
  blueLabel: string;
  redLabel: string;
  pos?: string;
  onPick: (name: string, t: DraftTeam) => void;
  onScout: (name: string) => void;
}) {
  const color = team ? TEAM_COLOR[team] : null;
  const posWR = getPosWR(name, stats);
  const overallWR = stats && stats.totalGames > 0 ? stats.winRate : null;
  const displayWR = posWR !== null ? Math.round(posWR * 100) : (overallWR !== null ? Math.round(overallWR * 100) : null);
  const isPosWR = posWR !== null;
  const teamLabel = team === "blue" ? blueLabel : team === "red" ? redLabel : null;

  const normPos = pos === "서폿" ? "서포터" : pos;
  const posStats = normPos ? stats?.positionStats?.[normPos] : null;
  const displayWins   = posStats && posStats.games > 0 ? posStats.wins   : (stats?.wins   ?? 0);
  const displayLosses = posStats && posStats.games > 0 ? posStats.losses : (stats?.losses ?? 0);

  return (
    <div className="rounded-xl p-2.5"
      style={{ background: color ? `${color}12` : "var(--panel)", border: `1.5px solid ${color || "var(--border)"}` }}>
      <button className="w-full text-left mb-2.5" onClick={() => onScout(name)}>
        <div className="flex items-center justify-between gap-1">
          <div className="text-sm font-black truncate" style={{ color: "var(--text)" }}>{name}</div>
          {teamLabel && (
            <span className="text-xs font-bold flex-shrink-0 px-1.5 py-0.5 rounded-full"
              style={{ background: TEAM_COLOR[team!] + "33", color: TEAM_COLOR[team!] }}>
              {teamLabel}
            </span>
          )}
        </div>
        {displayWR !== null ? (
          <>
            <div className="text-xs mt-0.5"
              style={{ color: displayWR >= 60 ? "#22c55e" : displayWR >= 50 ? "var(--text-muted)" : "#ef4444" }}>
              {displayWR}%{isPosWR ? "" : " (종합)"} · {displayWins}승{displayLosses}패
            </div>
          </>
        ) : (
          <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>기록 없음</div>
        )}
      </button>
      <div className="flex gap-1">
        {(["blue", "red"] as DraftTeam[]).map(t => (
          <button key={t} onClick={() => onPick(name, t)}
            className="flex-1 py-1 rounded-lg text-xs font-bold"
            style={{
              background: team === t ? TEAM_COLOR[t] : TEAM_COLOR[t] + "18",
              color: team === t ? "#fff" : TEAM_COLOR[t],
              border: `1px solid ${TEAM_COLOR[t]}44`,
            }}>
            {t === "blue" ? "🔵" : "🔴"}
          </button>
        ))}
      </div>
    </div>
  );
}

function PositionPairRow({ pair, blueTeam, redTeam, statsMap, blueLabel, redLabel, onPick, onScout, onReset }: {
  pair: typeof WORLDS_PAIRS[number];
  blueTeam: string[];
  redTeam: string[];
  statsMap: Record<string, PlayerStats>;
  blueLabel: string;
  redLabel: string;
  onPick: (name: string, t: DraftTeam) => void;
  onScout: (name: string) => void;
  onReset: (name: string) => void;
}) {
  const { pos, icon, p1, p2 } = pair;
  const p1Team: DraftTeam | null = blueTeam.includes(p1) ? "blue" : redTeam.includes(p1) ? "red" : null;
  const p2Team: DraftTeam | null = blueTeam.includes(p2) ? "blue" : redTeam.includes(p2) ? "red" : null;
  const decided = p1Team !== null;

  return (
    <div className="rounded-xl overflow-hidden mb-3"
      style={{ border: `1px solid ${decided ? "var(--accent)" : "var(--border)"}` }}>
      <div className="flex items-center justify-between px-3 py-1.5"
        style={{ background: decided ? "var(--hover)" : "var(--hover)", borderBottom: `1px solid ${decided ? "var(--accent)" : "var(--border)"}` }}>
        <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: decided ? "var(--accent)" : "var(--text-muted)" }}>
          <span>{icon}</span>
          <span>{pos}</span>
        </div>
        {decided && (
          <button onClick={() => onReset(p1)}
            className="text-xs px-2 py-0.5 rounded"
            style={{ color: "var(--text-dim)", background: "var(--panel)", border: "1px solid var(--border)" }}>
            초기화
          </button>
        )}
      </div>
      <div className="grid grid-cols-[1fr,20px,1fr] items-start gap-1 p-3">
        <PairPlayerCard name={p1} stats={statsMap[p1]} team={p1Team} blueLabel={blueLabel} redLabel={redLabel} pos={pos} onPick={onPick} onScout={onScout} />
        <div className="flex items-center justify-center" style={{ paddingTop: "1rem" }}>
          <span className="text-xs font-black" style={{ color: "var(--text-dim)" }}>vs</span>
        </div>
        <PairPlayerCard name={p2} stats={statsMap[p2]} team={p2Team} blueLabel={blueLabel} redLabel={redLabel} pos={pos} onPick={onPick} onScout={onScout} />
      </div>
    </div>
  );
}

function TeamSlotPanel({ label, team, players, nicknames, statsMap, onRemove }: {
  label: string;
  team: DraftTeam;
  players: string[];
  nicknames: NicknameEntry[];
  statsMap: Record<string, PlayerStats>;
  onRemove: (n: string) => void;
}) {
  const color = TEAM_COLOR[team];
  const avgWinRate = players.length > 0
    ? Math.round(players.reduce((sum, n) => {
        const s = statsMap[n];
        const wr = getPosWR(n, s) ?? (s && s.totalGames > 0 ? s.winRate : null);
        return sum + (wr !== null ? wr : 0);
      }, 0) / players.length * 100)
    : null;

  const slotted: (string | null)[] = Array(5).fill(null);
  players.forEach(nick => {
    const pair = WORLDS_PAIRS.find(p => p.p1 === nick || p.p2 === nick);
    if (pair) {
      const idx = WORLDS_PAIRS.indexOf(pair);
      slotted[idx] = nick;
    }
  });

  return (
    <div className="rounded-xl p-3" style={{ background: "var(--panel)", border: `1.5px solid ${color}44` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-black" style={{ color }}>
          {team === "blue" ? "🔵" : "🔴"} {label}
        </div>
        {avgWinRate !== null && (
          <div className="text-xs" style={{ color: "var(--text-dim)" }}>평균 {avgWinRate}%</div>
        )}
      </div>
      <div className="space-y-1.5">
        {WORLDS_PAIRS.map((pair, i) => {
          const nick = slotted[i];
          const stats = nick ? statsMap[nick] : null;
          return (
            <div key={pair.pos} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg min-h-[30px]"
              style={{
                background: nick ? `${color}18` : "var(--hover)",
                border: `1px solid ${nick ? color + "44" : "var(--border)"}`,
              }}>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-dim)", width: 16 }}>{pair.icon}</span>
              {nick ? (
                <>
                  <span className="text-xs font-bold flex-1 truncate" style={{ color: "var(--text)" }}>{nick}</span>
                  {stats && stats.totalGames > 0 && (
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-dim)" }}>
                      {Math.round((getPosWR(nick, stats) ?? stats.winRate) * 100)}%
                    </span>
                  )}
                  <button onClick={() => onRemove(nick)}
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-xs hover:opacity-70"
                    style={{ color }}>×</button>
                </>
              ) : (
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>미배정</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BalancePanel({ blueTeam, redTeam, statsMap, blueLabel, redLabel }: {
  blueTeam: string[];
  redTeam: string[];
  statsMap: Record<string, PlayerStats>;
  blueLabel: string;
  redLabel: string;
}) {
  const avgWR = (team: string[]) => {
    const withData = team.filter(n => {
      const s = statsMap[n];
      return getPosWR(n, s) !== null || (s?.totalGames ?? 0) > 0;
    });
    if (!withData.length) return 0;
    return Math.round(withData.reduce((s, n) => {
      const stat = statsMap[n];
      return s + (getPosWR(n, stat) ?? stat?.winRate ?? 0);
    }, 0) / withData.length * 100);
  };
  const blueWR = avgWR(blueTeam);
  const redWR = avgWR(redTeam);
  const total = blueWR + redWR;
  const blueRatio = total > 0 ? blueWR / total : 0.5;
  const diff = Math.abs(blueWR - redWR);
  const favored = blueWR > redWR ? blueLabel : blueWR < redWR ? redLabel : null;
  const blueChem = calcChemistry(blueTeam, statsMap);
  const redChem = calcChemistry(redTeam, statsMap);

  return (
    <div className="rounded-xl p-4 mb-5" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      <div className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>⚖️ 드래프트 밸런스</div>
      <div className="flex items-center gap-3 mb-3">
        <div className="text-center w-16 flex-shrink-0">
          <div className="text-lg font-black" style={{ color: TEAM_COLOR.blue }}>{blueWR}%</div>
          <div className="text-xs truncate" style={{ color: "var(--text-dim)" }}>{blueLabel}</div>
        </div>
        <div className="flex-1">
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--hover)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${blueRatio * 100}%`, background: `linear-gradient(to right, ${TEAM_COLOR.blue}, ${TEAM_COLOR.red})` }} />
          </div>
          <div className="text-center text-xs mt-1.5">
            {favored && diff > 0
              ? <span style={{ color: "var(--text-dim)" }}>{favored} 우세 <span style={{ color: favored === blueLabel ? TEAM_COLOR.blue : TEAM_COLOR.red }}>+{diff}%</span></span>
              : <span style={{ color: "var(--accent)" }}>⚖️ 완벽한 균형</span>
            }
          </div>
        </div>
        <div className="text-center w-16 flex-shrink-0">
          <div className="text-lg font-black" style={{ color: TEAM_COLOR.red }}>{redWR}%</div>
          <div className="text-xs truncate" style={{ color: "var(--text-dim)" }}>{redLabel}</div>
        </div>
      </div>
      {(blueChem !== null || redChem !== null) && (
        <div className="grid grid-cols-2 gap-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          {([["blue", blueLabel, blueChem], ["red", redLabel, redChem]] as [DraftTeam, string, number | null][]).map(([t, lbl, chem]) =>
            chem !== null ? (
              <div key={t} className="rounded-lg p-2.5 text-center"
                style={{ background: "var(--hover)", border: `1px solid ${TEAM_COLOR[t]}33` }}>
                <div className="text-xs mb-0.5" style={{ color: "var(--text-dim)" }}>팀 케미스트리</div>
                <div className="text-base font-black" style={{ color: TEAM_COLOR[t] }}>{chem}%</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>{lbl}</div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function ScoutingModal({ entry, stats, team, blueCount, redCount, blueLabel, redLabel, onAssign, onRemove, onClose }: {
  entry: NicknameEntry;
  stats?: PlayerStats | null;
  team: DraftTeam | null;
  blueCount: number;
  redCount: number;
  blueLabel: string;
  redLabel: string;
  onAssign: (nickname: string, team: DraftTeam) => void;
  onRemove: (nickname: string) => void;
  onClose: () => void;
}) {
  const teamLabels: Record<DraftTeam, string> = { blue: blueLabel, red: redLabel };
  const winRate = stats && stats.totalGames > 0 ? Math.round(stats.winRate * 100) : null;
  const kda = stats?.kdaTotal && stats.kdaTotal.games > 0
    ? ((stats.kdaTotal.kills + stats.kdaTotal.assists) / Math.max(stats.kdaTotal.deaths, 1)).toFixed(2)
    : null;

  const topPartner = stats
    ? Object.entries(stats.withStats)
        .filter(([, v]) => v.wins + v.losses >= 2)
        .sort((a, b) => b[1].wins / (b[1].wins + b[1].losses) - a[1].wins / (a[1].wins + a[1].losses))[0]
    : null;

  const hardestOpponent = stats
    ? Object.entries(stats.vsStats)
        .filter(([, v]) => v.wins + v.losses >= 2)
        .sort((a, b) => b[1].losses / (b[1].wins + b[1].losses) - a[1].losses / (a[1].wins + a[1].losses))[0]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", maxHeight: "88vh", overflowY: "auto" }}>

        {/* 헤더 */}
        <div className="px-5 pt-5 pb-4" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-black" style={{ color: "var(--accent)" }}>{entry.nickname}</div>
              {entry.realName && entry.realName !== entry.nickname && (
                <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{entry.realName}</div>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-sm font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: "var(--hover)", color: "var(--text-muted)" }}>
                  {entry.tier}{entry.tierDiv ? ` ${entry.tierDiv}` : ""}
                </span>
                {entry.roles.slice(0, 2).map(r => (
                  <span key={r} className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "var(--hover)", color: "var(--text-muted)" }}>{r}</span>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-lg flex-shrink-0"
              style={{ background: "var(--hover)", color: "var(--text-dim)" }}>×</button>
          </div>
          {team && (
            <div className="mt-3 text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
              style={{ background: TEAM_COLOR[team] + "22", color: TEAM_COLOR[team], border: `1px solid ${TEAM_COLOR[team]}44` }}>
              {team === "blue" ? "🔵" : "🔴"} {teamLabels[team]} 소속
            </div>
          )}
        </div>

        {/* 스탯 본문 */}
        <div className="px-5 py-4">
          {stats && stats.totalGames > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "승률", value: `${winRate}%`, color: winRate! >= 60 ? "#22c55e" : winRate! >= 50 ? "var(--accent)" : "#ef4444" },
                  { label: "전적", value: `${stats.wins}W/${stats.losses}L`, color: "var(--text)" },
                  { label: "점수", value: `${stats.score}P`, color: stats.score > 0 ? "#22c55e" : "#ef4444" },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-3 text-center"
                    style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                    <div className="text-sm font-black" style={{ color: item.color }}>{item.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {(kda || stats.maxWinStreak > 0 || stats.currentStreak !== 0) && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {kda && (
                    <div className="rounded-xl p-3 text-center" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                      <div className="text-sm font-black" style={{ color: "var(--text)" }}>{kda}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>KDA</div>
                    </div>
                  )}
                  {stats.maxWinStreak > 0 && (
                    <div className="rounded-xl p-3 text-center" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                      <div className="text-sm font-black" style={{ color: "#22c55e" }}>{stats.maxWinStreak}연승</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>최고 연승</div>
                    </div>
                  )}
                  {stats.currentStreak !== 0 && (
                    <div className="rounded-xl p-3 text-center" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                      <div className="text-sm font-black" style={{ color: stats.currentStreak > 0 ? "#22c55e" : "#ef4444" }}>
                        {stats.currentStreak > 0 ? `${stats.currentStreak}연승` : `${Math.abs(stats.currentStreak)}연패`}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>현재</div>
                    </div>
                  )}
                </div>
              )}

              {stats.topChampions.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>주력 챔피언</div>
                  <div className="space-y-1.5">
                    {stats.topChampions.slice(0, 3).map((c, i) => {
                      const wr = Math.round(c.wins / c.games * 100);
                      return (
                        <div key={c.name} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                          style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                          <span className="text-xs w-4 text-right flex-shrink-0" style={{ color: "var(--accent)" }}>{i + 1}</span>
                          <span className="text-sm font-bold flex-1" style={{ color: "var(--text)" }}>{c.name}</span>
                          <span className="text-xs" style={{ color: "var(--text-dim)" }}>{c.games}판</span>
                          <span className="text-xs font-bold w-8 text-right"
                            style={{ color: wr >= 60 ? "#22c55e" : wr >= 50 ? "var(--text)" : "#ef4444" }}>{wr}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(topPartner || hardestOpponent) && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {topPartner && (
                    <div className="rounded-xl p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                      <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>찰떡 팀원</div>
                      <div className="text-sm font-black truncate" style={{ color: "var(--text)" }}>{topPartner[0]}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#22c55e" }}>
                        함께 {Math.round(topPartner[1].wins / (topPartner[1].wins + topPartner[1].losses) * 100)}% 승
                      </div>
                    </div>
                  )}
                  {hardestOpponent && (
                    <div className="rounded-xl p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                      <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>천적</div>
                      <div className="text-sm font-black truncate" style={{ color: "var(--text)" }}>{hardestOpponent[0]}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#ef4444" }}>
                        맞서면 {Math.round(hardestOpponent[1].losses / (hardestOpponent[1].wins + hardestOpponent[1].losses) * 100)}% 패
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-sm" style={{ color: "var(--text-dim)" }}>
              아직 기록된 내전 데이터가 없습니다
            </div>
          )}
        </div>

        {/* 배정 버튼 */}
        <div className="px-5 pb-5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {(["blue", "red"] as DraftTeam[]).map(t => {
              const count = t === "blue" ? blueCount : redCount;
              const full = count >= 5 && team !== t;
              return (
                <button key={t}
                  disabled={full}
                  onClick={() => { onAssign(entry.nickname, t); onClose(); }}
                  className="py-2.5 rounded-xl text-sm font-bold"
                  style={{
                    background: team === t ? TEAM_COLOR[t] : TEAM_COLOR[t] + "22",
                    color: team === t ? "#fff" : TEAM_COLOR[t],
                    border: `1.5px solid ${TEAM_COLOR[t]}55`,
                    opacity: full ? 0.4 : 1,
                    cursor: full ? "not-allowed" : "pointer",
                  }}>
                  {t === "blue" ? "🔵" : "🔴"} {teamLabels[t]}{team === t ? " ✓" : ""}
                </button>
              );
            })}
          </div>
          {team && (
            <button onClick={() => { onRemove(entry.nickname); onClose(); }}
              className="w-full py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--hover)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
              팀에서 제외
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DraftTab() {
  const [loading, setLoading] = useState(true);
  const [playerEntries, setPlayerEntries] = useState<NicknameEntry[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, PlayerStats>>({});
  const [blueTeam, setBlueTeam] = useState<string[]>([]);
  const [redTeam, setRedTeam] = useState<string[]>([]);
  const [coachBlue, setCoachBlue] = useState<string | null>(null);
  const [coachRed, setCoachRed] = useState<string | null>(null);
  const [scout, setScout] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadGameRecords(), loadNicknames()]).then(([recs, nicks]) => {
      const entries: NicknameEntry[] = WORLDS_PLAYERS.map(name => {
        const found = matchEntry(name, nicks);
        return found ?? ({ id: name, nickname: name, realName: name, tier: "—", roles: [], altNicknames: [] } as NicknameEntry);
      });
      setPlayerEntries(entries);
      const map: Record<string, PlayerStats> = {};
      // statsMap을 페어 이름(WORLDS_PLAYERS)으로 키 설정 — blueTeam/redTeam이 페어 이름을 저장하기 때문
      WORLDS_PLAYERS.forEach((pairName, idx) => {
        map[pairName] = computePlayerStats(entries[idx].nickname, recs, nicks);
      });
      setStatsMap(map);
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const d = JSON.parse(saved) as { blueTeam?: string[]; redTeam?: string[]; coachBlue?: string; coachRed?: string };
          setBlueTeam(Array.isArray(d.blueTeam) ? d.blueTeam : []);
          setRedTeam(Array.isArray(d.redTeam) ? d.redTeam : []);
          setCoachBlue(d.coachBlue ?? null);
          setCoachRed(d.coachRed ?? null);
        }
      } catch {}
      setLoading(false);
    });
  }, []);

  const persist = (blue: string[], red: string[], cb: string | null, cr: string | null) => {
    try { localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ blueTeam: blue, redTeam: red, coachBlue: cb, coachRed: cr })); } catch {}
  };

  const getPairOf = (name: string) => WORLDS_PAIRS.find(p => p.p1 === name || p.p2 === name);

  const assignWithPair = (name: string, t: DraftTeam) => {
    const pair = getPairOf(name);
    if (!pair) return;
    const partner = pair.p1 === name ? pair.p2 : pair.p1;
    const newBlue = blueTeam.filter(n => n !== name && n !== partner);
    const newRed  = redTeam.filter(n => n !== name && n !== partner);
    if (t === "blue") { newBlue.push(name); newRed.push(partner); }
    else              { newRed.push(name);  newBlue.push(partner); }
    setBlueTeam(newBlue); setRedTeam(newRed);
    persist(newBlue, newRed, coachBlue, coachRed);
  };

  const resetPair = (name: string) => {
    const pair = getPairOf(name);
    if (!pair) return;
    const newBlue = blueTeam.filter(n => n !== pair.p1 && n !== pair.p2);
    const newRed  = redTeam.filter(n => n !== pair.p1 && n !== pair.p2);
    setBlueTeam(newBlue); setRedTeam(newRed);
    persist(newBlue, newRed, coachBlue, coachRed);
  };

  const assignCoach = (coach: string, t: DraftTeam) => {
    const newCB = t === "blue" ? coach : (coachBlue === coach ? null : coachBlue);
    const newCR = t === "red"  ? coach : (coachRed  === coach ? null : coachRed);
    setCoachBlue(newCB); setCoachRed(newCR);
    persist(blueTeam, redTeam, newCB, newCR);
  };

  const removeCoach = (coach: string) => {
    const newCB = coachBlue === coach ? null : coachBlue;
    const newCR = coachRed  === coach ? null : coachRed;
    setCoachBlue(newCB); setCoachRed(newCR);
    persist(blueTeam, redTeam, newCB, newCR);
  };

  const getTeamOf = (n: string): DraftTeam | null => blueTeam.includes(n) ? "blue" : redTeam.includes(n) ? "red" : null;
  const getCoachTeam = (c: string): DraftTeam | null => coachBlue === c ? "blue" : coachRed === c ? "red" : null;

  const blueLabel = coachBlue ? `${coachBlue}팀` : "블루팀";
  const redLabel  = coachRed  ? `${coachRed}팀`  : "레드팀";

  const scoutEntry = scout ? (playerEntries.find(n => n.nickname === scout) ?? null) : null;
  const scoutStats = scout ? (statsMap[scout] ?? null) : null;
  const draftComplete = blueTeam.length === 5 && redTeam.length === 5;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>선수 데이터 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-black" style={{ color: "var(--accent)" }}>팀 드래프트</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            선수 카드를 클릭해 스카우팅 리포트를 확인하고 팀을 배정하세요
          </p>
        </div>
        <button
          onClick={() => { setBlueTeam([]); setRedTeam([]); setCoachBlue(null); setCoachRed(null); persist([], [], null, null); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "var(--hover)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
          초기화
        </button>
      </div>

      {/* 감독 배정 */}
      <div className="rounded-xl p-3 mb-4" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
        <div className="text-xs font-bold mb-2.5" style={{ color: "var(--text-muted)" }}>🎖️ 감독 배정</div>
        <div className="grid grid-cols-2 gap-3">
          {WORLDS_COACHES.map(coach => {
            const ct = getCoachTeam(coach);
            const color = ct ? TEAM_COLOR[ct] : null;
            return (
              <div key={coach} className="rounded-xl p-3"
                style={{ background: color ? `${color}12` : "var(--hover)", border: `1px solid ${color ? color + "44" : "var(--border)"}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-black" style={{ color: "var(--text)" }}>{coach}</div>
                    <div className="text-xs" style={{ color: "var(--text-dim)" }}>감독</div>
                  </div>
                  {ct && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: TEAM_COLOR[ct] + "33", color: TEAM_COLOR[ct] }}>
                      {ct === "blue" ? blueLabel : redLabel}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {(["blue", "red"] as DraftTeam[]).map(t => {
                    const takenByOther = (t === "blue" ? coachBlue : coachRed) !== null && (t === "blue" ? coachBlue : coachRed) !== coach;
                    return (
                      <button key={t}
                        disabled={!!takenByOther}
                        onClick={() => ct === t ? removeCoach(coach) : assignCoach(coach, t)}
                        className="flex-1 py-1 rounded-lg text-xs font-bold"
                        style={{
                          background: ct === t ? TEAM_COLOR[t] : TEAM_COLOR[t] + "18",
                          color: ct === t ? "#fff" : TEAM_COLOR[t],
                          border: `1px solid ${TEAM_COLOR[t]}44`,
                          opacity: takenByOther ? 0.3 : 1,
                          cursor: takenByOther ? "not-allowed" : "pointer",
                        }}>
                        {t === "blue" ? "🔵" : "🔴"}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 밸런스 (드래프트 완료 시) */}
      {draftComplete && (
        <BalancePanel blueTeam={blueTeam} redTeam={redTeam} statsMap={statsMap} blueLabel={blueLabel} redLabel={redLabel} />
      )}

      {/* 팀 슬롯 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <TeamSlotPanel label={blueLabel} team="blue" players={blueTeam} nicknames={playerEntries} statsMap={statsMap} onRemove={resetPair} />
        <TeamSlotPanel label={redLabel}  team="red"  players={redTeam}  nicknames={playerEntries} statsMap={statsMap} onRemove={resetPair} />
      </div>

      {/* 포지션별 대결 구도 */}
      <div className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>
        포지션별 대결 구도 · {WORLDS_PAIRS.filter(p => blueTeam.includes(p.p1) || redTeam.includes(p.p1)).length}/{WORLDS_PAIRS.length} 포지션 배정 완료
      </div>
      <div>
        {WORLDS_PAIRS.map(pair => (
          <PositionPairRow
            key={pair.pos}
            pair={pair}
            blueTeam={blueTeam}
            redTeam={redTeam}
            statsMap={statsMap}
            blueLabel={blueLabel}
            redLabel={redLabel}
            onPick={assignWithPair}
            onScout={setScout}
            onReset={resetPair}
          />
        ))}
      </div>

      {/* 스카우팅 모달 */}
      {scout && scoutEntry && (
        <ScoutingModal
          entry={scoutEntry}
          stats={scoutStats}
          team={getTeamOf(scout)}
          blueCount={blueTeam.length}
          redCount={redTeam.length}
          blueLabel={blueLabel}
          redLabel={redLabel}
          onAssign={assignWithPair}
          onRemove={resetPair}
          onClose={() => setScout(null)}
        />
      )}
    </div>
  );
}

// ─── 월즈 에디션 선수 카드 ────────────────────────────────────────────────────

function WorldsPlayerCard({ name, stats, team, isWinner, pastRounds, posMvpAce, champPool }: {
  name: string;
  stats?: PlayerStats;
  team: DraftTeam;
  isWinner: boolean;
  pastRounds: Array<{ won: boolean }>;
  posMvpAce?: { mvp: number; ace: number };
  champPool?: number;
}) {
  const { ovr, wrStat, kdaStat, mvpAceStat, champPoolStat } = calcOVR(name, stats, posMvpAce, champPool);
  const pair = WORLDS_PAIRS.find(p => p.p1 === name || p.p2 === name);
  const totalMvpAce = (posMvpAce?.mvp ?? stats?.mvpCount ?? 0) + (posMvpAce?.ace ?? stats?.aceCount ?? 0);

  const gold   = isWinner;
  const col    = TEAM_COLOR[team];
  const bgGrad = gold
    ? "linear-gradient(170deg, #2e1e00 0%, #6b4d0c 30%, #b8861a 50%, #6b4d0c 70%, #2e1e00 100%)"
    : `linear-gradient(170deg, var(--bg) 0%, ${col}18 50%, ${col}30 100%)`;
  const borderCol  = gold ? "#c49a1a" : col + "55";
  const ovrCol     = gold ? "#ffe066" : col;
  const nameCol    = gold ? "#fff"    : "var(--text)";
  const subCol     = gold ? "#c49a1acc" : "var(--text-dim)";
  const barBg      = gold ? "rgba(255,255,255,0.12)" : "var(--hover)";
  const barFill    = gold ? "#ffe066" : col;
  const statNumCol = gold ? "#fff"    : "var(--text-muted)";
  const statLblCol = gold ? "#c49a1a" : "var(--text-dim)";

  const ATTRS = [
    { label: "WIN", val: wrStat },
    { label: "KDA", val: kdaStat },
    { label: "ACE", val: mvpAceStat },
    { label: "POL", val: champPoolStat },
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden flex-shrink-0 select-none"
      style={{
        width: 118, background: bgGrad,
        border: `1.5px solid ${borderCol}`,
        boxShadow: gold ? "0 4px 24px rgba(196,154,26,0.45)" : `0 2px 10px ${col}20`,
      }}>

      {/* OVR + 포지션 */}
      <div className="flex items-start justify-between px-2.5 pt-2.5">
        <div>
          <div className="font-black leading-none" style={{ fontSize: 30, color: ovrCol, lineHeight: 1 }}>{ovr}</div>
          <div className="font-black mt-0.5" style={{ fontSize: 10, color: ovrCol, letterSpacing: 1 }}>{pair?.pos ?? "—"}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {gold && <span style={{ fontSize: 18 }}>🏆</span>}
          <span style={{ fontSize: 14 }}>{pair?.icon ?? ""}</span>
        </div>
      </div>

      {/* 선수명 + MVP/ACE */}
      <div className="text-center py-2 px-1">
        <div className="font-black truncate px-1" style={{ fontSize: 14, color: nameCol }}>{name}</div>
        <div style={{ fontSize: 10, color: subCol, marginTop: 1, minHeight: 12 }}>
          {totalMvpAce > 0 ? `MVP+ACE ${totalMvpAce}` : "—"}
        </div>
      </div>

      {/* 스탯 바 4개 */}
      <div className="px-2.5 pb-2 space-y-1">
        {ATTRS.map(({ label, val }) => (
          <div key={label} className="flex items-center gap-1">
            <span style={{ fontSize: 8, color: statLblCol, width: 20, textAlign: "right", flexShrink: 0 }}>{label}</span>
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: barBg }}>
              <div style={{ width: `${val}%`, height: "100%", background: barFill, borderRadius: 9999 }} />
            </div>
            <span style={{ fontSize: 9, color: statNumCol, width: 15, textAlign: "right", flexShrink: 0 }}>{val}</span>
          </div>
        ))}
      </div>

      {/* 역대 시즌 닷 */}
      {pastRounds.length > 0 && (
        <div className="flex justify-center gap-1 pb-2.5">
          {pastRounds.slice(-6).map((r, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: r.won ? "#f59e0b" : "var(--text-dim)",
              flexShrink: 0,
            }} />
          ))}
        </div>
      )}

      {/* 골드 shimmer */}
      {gold && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,225,70,0.12) 50%, transparent 70%)" }} />
      )}
    </div>
  );
}

// ─── AI 예측 ──────────────────────────────────────────────────────────────────

function buildLanePrediction(
  bP: string, rP: string,
  bWR: number | null, rWR: number | null,
  h2h: { wins: number; losses: number } | null,
  bStreak: number, rStreak: number,
): { sentences: string[]; winner: string | null; blueScore: number; redScore: number } {
  let blueScore = 0;
  let redScore = 0;
  const sentences: string[] = [];

  if (bWR !== null && rWR !== null) {
    const diff = bWR - rWR;
    const abs = Math.abs(diff);
    const hi = diff > 0 ? bP : rP;
    const lo = diff > 0 ? rP : bP;
    const hiWR = Math.max(bWR, rWR);
    const loWR = Math.min(bWR, rWR);
    if (diff > 0) blueScore += abs >= 15 ? 3 : abs >= 8 ? 2 : abs >= 3 ? 1 : 0;
    else redScore += abs >= 15 ? 3 : abs >= 8 ? 2 : abs >= 3 ? 1 : 0;
    if (abs >= 15) sentences.push(`${hi}님의 승률(${hiWR}%)이 ${lo}님(${loWR}%)을 압도합니다.`);
    else if (abs >= 8) sentences.push(`승률에서 ${hi}님(${hiWR}%)이 ${lo}님(${loWR}%)을 뚜렷이 앞섭니다.`);
    else if (abs >= 3) sentences.push(`승률은 ${hi}님(${hiWR}%) 소폭 우세. ${lo}님(${loWR}%)도 충분히 뒤집을 수 있는 차이.`);
    else sentences.push(`승률 ${bWR}% vs ${rWR}%로 사실상 동률 — 컨디션이 변수.`);
  }

  if (h2h) {
    const total = h2h.wins + h2h.losses;
    if (total >= 2) {
      if (h2h.wins > h2h.losses) { blueScore += h2h.wins - h2h.losses >= 3 ? 2 : 1; sentences.push(`상대전적 ${h2h.wins}:${h2h.losses}으로 ${bP}님 우세.`); }
      else if (h2h.losses > h2h.wins) { redScore += h2h.losses - h2h.wins >= 3 ? 2 : 1; sentences.push(`상대전적 ${h2h.wins}:${h2h.losses}으로 ${rP}님 우세.`); }
      else { sentences.push(`상대전적 ${h2h.wins}:${h2h.losses} 동률.`); }
    }
  }

  if (bStreak >= 3) { blueScore += 2; sentences.push(`${bP}님 ${bStreak}연승 질주 🔥`); }
  else if (bStreak >= 2) { blueScore += 1; sentences.push(`${bP}님 ${bStreak}연승 기세.`); }
  else if (bStreak <= -3) { redScore += 1; sentences.push(`${bP}님 ${Math.abs(bStreak)}연패 슬럼프.`); }

  if (rStreak >= 3) { redScore += 2; sentences.push(`${rP}님 ${rStreak}연승 질주 🔥`); }
  else if (rStreak >= 2) { redScore += 1; sentences.push(`${rP}님 ${rStreak}연승 기세.`); }
  else if (rStreak <= -3) { blueScore += 1; sentences.push(`${rP}님 ${Math.abs(rStreak)}연패 슬럼프.`); }

  const winner = blueScore > redScore ? bP : redScore > blueScore ? rP : null;
  return { sentences, winner, blueScore, redScore };
}

// ─── 선수단 탭 ────────────────────────────────────────────────────────────────

type SeasonRecord = {
  team: DraftTeam; date: string;
  blueLabel: string; redLabel: string;
  blueTeam: string[]; redTeam: string[];
};

function PlayersTab() {
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap]         = useState<Record<string, PlayerStats>>({});
  const [entriesMap, setEntriesMap]     = useState<Record<string, NicknameEntry>>({});
  const [posMvpAceMap, setPosMvpAceMap] = useState<Record<string, { mvp: number; ace: number }>>({});
  const [champPoolMap, setChampPoolMap] = useState<Record<string, number>>({});
  const [draftData, setDraftData]       = useState<{
    blueTeam: string[]; redTeam: string[];
    coachBlue: string | null; coachRed: string | null;
  }>({ blueTeam: [], redTeam: [], coachBlue: null, coachRed: null });
  const [currentWinner, setCurrentWinner] = useState<SeasonRecord | null>(null);
  const [seasonHistory, setSeasonHistory] = useState<SeasonRecord[]>([]);
  const [showPicker, setShowPicker]       = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        setDraftData({
          blueTeam: Array.isArray(d.blueTeam) ? d.blueTeam : [],
          redTeam:  Array.isArray(d.redTeam)  ? d.redTeam  : [],
          coachBlue: d.coachBlue ?? null, coachRed: d.coachRed ?? null,
        });
      }
    } catch {}
    try {
      const w = localStorage.getItem("worlds_current_winner_v1");
      if (w) setCurrentWinner(JSON.parse(w));
      const h = localStorage.getItem("worlds_season_history_v1");
      if (h) setSeasonHistory(JSON.parse(h));
    } catch {}
    Promise.all([loadGameRecords(), loadNicknames()]).then(([recs, nicks]) => {
      const eMap: Record<string, NicknameEntry> = {};
      const sMap: Record<string, PlayerStats> = {};
      WORLDS_PLAYERS.forEach(name => {
        const found = matchEntry(name, nicks);
        const entry = found ?? ({ id: name, nickname: name, realName: name, tier: "—", roles: [], altNicknames: [] } as NicknameEntry);
        eMap[name] = entry;
        sMap[name] = computePlayerStats(entry.nickname, recs, nicks);
      });
      setEntriesMap(eMap);
      setStatsMap(sMap);
      const mvpAceMap: Record<string, { mvp: number; ace: number }> = {};
      const cPoolMap: Record<string, number> = {};
      WORLDS_PAIRS.forEach(pair => {
        [pair.p1, pair.p2].forEach(pairName => {
          mvpAceMap[pairName] = computePosMvpAce(eMap[pairName], pair.pos, recs);
          cPoolMap[pairName]  = computePosChampPool(eMap[pairName], pair.pos, recs);
        });
      });
      setPosMvpAceMap(mvpAceMap);
      setChampPoolMap(cPoolMap);
      setLoading(false);
    });
  }, []);

  const confirmWinner = (winTeam: DraftTeam) => {
    const rec: SeasonRecord = {
      team: winTeam, date: new Date().toISOString().split("T")[0],
      blueLabel, redLabel,
      blueTeam: [...blueTeam], redTeam: [...redTeam],
    };
    const newHistory = [...seasonHistory, rec];
    setCurrentWinner(rec);
    setSeasonHistory(newHistory);
    setShowPicker(false);
    try {
      localStorage.setItem("worlds_current_winner_v1", JSON.stringify(rec));
      localStorage.setItem("worlds_season_history_v1", JSON.stringify(newHistory));
    } catch {}
  };

  const cancelWinner = () => {
    setCurrentWinner(null);
    try { localStorage.removeItem("worlds_current_winner_v1"); } catch {}
  };

  const { blueTeam, redTeam, coachBlue, coachRed } = draftData;
  const blueLabel = coachBlue ? `${coachBlue}팀` : "블루팀";
  const redLabel  = coachRed  ? `${coachRed}팀`  : "레드팀";
  const draftComplete = blueTeam.length === 5 && redTeam.length === 5;

  const normS = (s: string) => s.replace(/\s/g, "").toLowerCase();

  const getH2H = (player: string, opponent: string) => {
    const s = statsMap[player];
    if (!s?.vsStats) return null;
    const opp = entriesMap[opponent];
    const names = [opponent, opp?.nickname, opp?.realName, ...(opp?.altNicknames ?? [])].filter(Boolean) as string[];
    const e = Object.entries(s.vsStats).find(([k]) => names.some(n => normS(k) === normS(n)));
    return e ? e[1] : null;
  };

  const getDisplayWR = (name: string): { wr: number; isPosSpecific: boolean } | null => {
    const s = statsMap[name];
    const pos = getPosWR(name, s);
    if (pos !== null) return { wr: Math.round(pos * 100), isPosSpecific: true };
    if ((s?.totalGames ?? 0) > 0) return { wr: Math.round(s!.winRate * 100), isPosSpecific: false };
    return null;
  };

  const getVerdict = (bP: string, rP: string) => {
    const bWR = getDisplayWR(bP);
    const rWR = getDisplayWR(rP);
    if (!bWR || !rWR) return null;
    const diff = bWR.wr - rWR.wr;
    const abs = Math.abs(diff);
    if (abs < 3) return { label: "팽팽", color: "#a78bfa", favor: null as "blue" | "red" | null };
    if (abs < 8) return { label: diff > 0 ? "약우세" : "약열세", color: diff > 0 ? TEAM_COLOR.blue : TEAM_COLOR.red, favor: (diff > 0 ? "blue" : "red") as "blue" | "red" };
    return { label: diff > 0 ? "우세" : "열세", color: diff > 0 ? TEAM_COLOR.blue : TEAM_COLOR.red, favor: (diff > 0 ? "blue" : "red") as "blue" | "red" };
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>선수 데이터 불러오는 중...</p>
    </div>
  );

  if (!draftComplete) return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="text-4xl">⚔️</div>
      <h3 className="text-lg font-black" style={{ color: "var(--accent)" }}>드래프트를 먼저 완료해주세요</h3>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        드래프트 탭에서 5대5 팀 구성을 마치면<br />선수단 상세 정보가 여기에 표시됩니다.
      </p>
    </div>
  );

  const teamAvgWR = (team: string[]) => {
    const vals = team.map(n => getDisplayWR(n)).filter(Boolean) as { wr: number }[];
    if (!vals.length) return null;
    return Math.round(vals.reduce((s, v) => s + v.wr, 0) / vals.length);
  };
  const blueAvgWR = teamAvgWR(blueTeam);
  const redAvgWR  = teamAvgWR(redTeam);
  const blueChem  = calcChemistry(blueTeam, statsMap);
  const redChem   = calcChemistry(redTeam, statsMap);

  const teamMVP = (t: string[]) => t.reduce((s, n) => s + (statsMap[n]?.mvpCount ?? 0), 0);
  const teamAce = (t: string[]) => t.reduce((s, n) => s + (statsMap[n]?.aceCount ?? 0), 0);

  const allPlayers = [...blueTeam, ...redTeam];
  const topWRPlayer = allPlayers.filter(n => (statsMap[n]?.totalGames ?? 0) >= 5)
    .sort((a, b) => (getDisplayWR(b)?.wr ?? 0) - (getDisplayWR(a)?.wr ?? 0))[0];
  const hotPlayer   = allPlayers.filter(n => (statsMap[n]?.currentStreak ?? 0) >= 2)
    .sort((a, b) => (statsMap[b]?.currentStreak ?? 0) - (statsMap[a]?.currentStreak ?? 0))[0];
  const coldPlayer  = allPlayers.filter(n => (statsMap[n]?.currentStreak ?? 0) <= -2)
    .sort((a, b) => (statsMap[a]?.currentStreak ?? 0) - (statsMap[b]?.currentStreak ?? 0))[0];
  const mostMVP     = allPlayers.filter(n => (statsMap[n]?.mvpCount ?? 0) > 0)
    .sort((a, b) => (statsMap[b]?.mvpCount ?? 0) - (statsMap[a]?.mvpCount ?? 0))[0];

  const keyPair = WORLDS_PAIRS.map(pair => {
    const [bP, rP] = blueTeam.includes(pair.p1) ? [pair.p1, pair.p2] : [pair.p2, pair.p1];
    const bWR = getDisplayWR(bP)?.wr ?? 0;
    const rWR = getDisplayWR(rP)?.wr ?? 0;
    return { pair, bP, rP, gap: Math.abs(bWR - rWR), favor: bWR >= rWR ? blueLabel : redLabel };
  }).sort((a, b) => b.gap - a.gap)[0];

  const keyMatchText = keyPair?.gap >= 3
    ? `${keyPair.pair.pos} 라인 ${keyPair.bP} vs ${keyPair.rP}이 이번 경기의 분수령. ${keyPair.favor} 우위.`
    : "5개 포지션 모두 팽팽한 균형. 팀 케미스트리가 승부를 가를 것으로 예상.";

  const lanePreds = WORLDS_PAIRS.map(pair => {
    const [bP, rP] = blueTeam.includes(pair.p1) ? [pair.p1, pair.p2] : [pair.p2, pair.p1];
    const bWRObj = getDisplayWR(bP);
    const rWRObj = getDisplayWR(rP);
    const h2h = getH2H(bP, rP);
    const bStreak = statsMap[bP]?.currentStreak ?? 0;
    const rStreak = statsMap[rP]?.currentStreak ?? 0;
    return { pair, bP, rP, pred: buildLanePrediction(bP, rP, bWRObj?.wr ?? null, rWRObj?.wr ?? null, h2h, bStreak, rStreak) };
  });

  const overallBlue = lanePreds.reduce((s, l) => s + l.pred.blueScore, 0);
  const overallRed  = lanePreds.reduce((s, l) => s + l.pred.redScore, 0);
  const overallWinner  = overallBlue > overallRed ? blueLabel : overallRed > overallBlue ? redLabel : null;
  const overallGap     = Math.abs(overallBlue - overallRed);
  const blueWinLanes   = lanePreds.filter(l => l.pred.winner === l.bP).length;
  const redWinLanes    = lanePreds.filter(l => l.pred.winner === l.rP).length;

  const WRColor = (wr: number | null) =>
    wr === null ? "var(--text-dim)" : wr >= 60 ? "#22c55e" : wr >= 50 ? "var(--text-muted)" : "#ef4444";

  return (
    <div className="py-4">

      {/* ── 팀 배너 ── */}
      <div className="rounded-2xl overflow-hidden mb-6"
        style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>
        <div className="grid grid-cols-[1fr,auto,1fr]">
          <div className="p-4" style={{ background: `${TEAM_COLOR.blue}0d`, borderRight: "1px solid var(--border)" }}>
            <div className="text-xs font-bold mb-1" style={{ color: TEAM_COLOR.blue }}>🔵 {blueLabel}</div>
            {coachBlue && <div className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>감독 {coachBlue}</div>}
            {blueAvgWR !== null && <div className="text-3xl font-black" style={{ color: TEAM_COLOR.blue }}>{blueAvgWR}%</div>}
            <div className="text-xs mt-0.5 mb-2" style={{ color: "var(--text-dim)" }}>포지션 평균 승률</div>
            <div className="flex flex-wrap gap-1">
              {blueChem !== null && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#22c55e22", color: "#22c55e" }}>케미 {blueChem}%</span>}
              {teamMVP(blueTeam) > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#f59e0b22", color: "#f59e0b" }}>MVP {teamMVP(blueTeam)}</span>}
              {blueTeam.some(n => (statsMap[n]?.currentStreak ?? 0) >= 2) && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#ef444422", color: "#ef4444" }}>🔥 연승</span>}
            </div>
          </div>
          <div className="flex items-center justify-center px-3">
            <span className="text-sm font-black" style={{ color: "var(--text-dim)" }}>VS</span>
          </div>
          <div className="p-4 text-right" style={{ background: `${TEAM_COLOR.red}0d`, borderLeft: "1px solid var(--border)" }}>
            <div className="text-xs font-bold mb-1" style={{ color: TEAM_COLOR.red }}>🔴 {redLabel}</div>
            {coachRed && <div className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>감독 {coachRed}</div>}
            {redAvgWR !== null && <div className="text-3xl font-black" style={{ color: TEAM_COLOR.red }}>{redAvgWR}%</div>}
            <div className="text-xs mt-0.5 mb-2" style={{ color: "var(--text-dim)" }}>포지션 평균 승률</div>
            <div className="flex flex-wrap gap-1 justify-end">
              {redChem !== null && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#22c55e22", color: "#22c55e" }}>케미 {redChem}%</span>}
              {teamMVP(redTeam) > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#f59e0b22", color: "#f59e0b" }}>MVP {teamMVP(redTeam)}</span>}
              {redTeam.some(n => (statsMap[n]?.currentStreak ?? 0) >= 2) && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#ef444422", color: "#ef4444" }}>🔥 연승</span>}
            </div>
          </div>
        </div>
        {blueAvgWR !== null && redAvgWR !== null && (() => {
          const t = blueAvgWR + redAvgWR;
          const bp = t > 0 ? Math.round(blueAvgWR / t * 100) : 50;
          return (
            <div className="px-4 pb-3 pt-1">
              <div className="h-1.5 rounded-full overflow-hidden flex">
                <div style={{ width: `${bp}%`, background: TEAM_COLOR.blue }} />
                <div style={{ flex: 1, background: TEAM_COLOR.red }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── 주목 선수 ── */}
      {(topWRPlayer || mostMVP || hotPlayer || coldPlayer) && (
        <div className="mb-4">
          <div className="text-xs font-bold mb-2 tracking-wider" style={{ color: "var(--text-muted)" }}>⚡ 주목 선수</div>
          <div className="grid grid-cols-2 gap-1.5">
            {topWRPlayer && (
              <div className="rounded-lg p-2" style={{ background: "var(--panel)", border: "1px solid #22c55e44" }}>
                <div className="text-xs font-bold mb-0.5" style={{ color: "#22c55e" }}>👑 최고 승률</div>
                <div className="text-sm font-black" style={{ color: "var(--text)" }}>{topWRPlayer}</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>{getDisplayWR(topWRPlayer)?.wr}% 승률</div>
              </div>
            )}
            {mostMVP && (
              <div className="rounded-lg p-2" style={{ background: "var(--panel)", border: "1px solid #f59e0b44" }}>
                <div className="text-xs font-bold mb-0.5" style={{ color: "#f59e0b" }}>🏅 최다 MVP</div>
                <div className="text-sm font-black" style={{ color: "var(--text)" }}>{mostMVP}</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>MVP {statsMap[mostMVP]?.mvpCount}회</div>
              </div>
            )}
            {hotPlayer && (
              <div className="rounded-lg p-2" style={{ background: "var(--panel)", border: "1px solid #f59e0b44" }}>
                <div className="text-xs font-bold mb-0.5" style={{ color: "#f59e0b" }}>🔥 연승 중</div>
                <div className="text-sm font-black" style={{ color: "var(--text)" }}>{hotPlayer}</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>{statsMap[hotPlayer]?.currentStreak}연승 행진</div>
              </div>
            )}
            {coldPlayer && (
              <div className="rounded-lg p-2" style={{ background: "var(--panel)", border: "1px solid #6b728044" }}>
                <div className="text-xs font-bold mb-0.5" style={{ color: "var(--text-dim)" }}>❄️ 슬럼프</div>
                <div className="text-sm font-black" style={{ color: "var(--text)" }}>{coldPlayer}</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>{Math.abs(statsMap[coldPlayer]?.currentStreak ?? 0)}연패 주의</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 팀 케미스트리 ── */}
      {(blueChem !== null || redChem !== null) && (
        <div className="mb-4">
          <div className="text-xs font-bold mb-2 tracking-wider" style={{ color: "var(--text-muted)" }}>🤝 팀 케미스트리</div>
          <div className="grid grid-cols-2 gap-2">
            {([["blue", blueLabel, blueTeam] as const, ["red", redLabel, redTeam] as const]).map(([t, label, team]) => {
              const chem = t === "blue" ? blueChem : redChem;
              const col  = TEAM_COLOR[t];
              const mvp  = teamMVP(team);
              const ace  = teamAce(team);
              return chem !== null ? (
                <div key={t} className="rounded-lg p-2"
                  style={{ background: "var(--panel)", border: `1px solid ${col}33` }}>
                  <div className="text-xs mb-0.5" style={{ color: col }}>{label}</div>
                  <div className="text-xl font-black" style={{ color: col }}>{chem}%</div>
                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>팀원 간 시너지</div>
                  {(mvp > 0 || ace > 0) && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {mvp > 0 && <span className="text-xs px-1 py-0.5 rounded" style={{ background: "#f59e0b22", color: "#f59e0b", fontSize: 10 }}>MVP ×{mvp}</span>}
                      {ace > 0 && <span className="text-xs px-1 py-0.5 rounded" style={{ background: "#a78bfa22", color: "#a78bfa", fontSize: 10 }}>ACE ×{ace}</span>}
                    </div>
                  )}
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* ── AI 전체 승부 예측 ── */}
      <div className="rounded-xl overflow-hidden mb-4"
        style={{ border: "1px solid #8b5cf644", background: "var(--panel)" }}>
        <div className="px-3 py-2 flex items-center gap-2"
          style={{ background: "#8b5cf610", borderBottom: "1px solid #8b5cf622" }}>
          <span className="text-sm">🤖</span>
          <span className="text-xs font-black" style={{ color: "#8b5cf6" }}>AI 전체 승부 예측</span>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <div className="rounded-lg p-2 text-center" style={{ background: `${TEAM_COLOR.blue}12`, border: `1px solid ${TEAM_COLOR.blue}44` }}>
              <div className="text-xl font-black" style={{ color: TEAM_COLOR.blue }}>{blueWinLanes}</div>
              <div className="text-xs" style={{ color: "var(--text-dim)", fontSize: 10 }}>라인 우세</div>
              <div className="font-bold" style={{ color: TEAM_COLOR.blue, fontSize: 10 }}>{blueLabel}</div>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
              <div className="text-xl font-black" style={{ color: "#a78bfa" }}>{5 - blueWinLanes - redWinLanes}</div>
              <div className="text-xs" style={{ color: "var(--text-dim)", fontSize: 10 }}>예측 불가</div>
              <div className="font-bold" style={{ color: "#a78bfa", fontSize: 10 }}>접전</div>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ background: `${TEAM_COLOR.red}12`, border: `1px solid ${TEAM_COLOR.red}44` }}>
              <div className="text-xl font-black" style={{ color: TEAM_COLOR.red }}>{redWinLanes}</div>
              <div className="text-xs" style={{ color: "var(--text-dim)", fontSize: 10 }}>라인 우세</div>
              <div className="font-bold" style={{ color: TEAM_COLOR.red, fontSize: 10 }}>{redLabel}</div>
            </div>
          </div>
          <div className="rounded-lg p-2" style={{
            background: overallWinner === blueLabel ? `${TEAM_COLOR.blue}10` : overallWinner === redLabel ? `${TEAM_COLOR.red}10` : "#a78bfa10",
            border: `1px solid ${overallWinner === blueLabel ? TEAM_COLOR.blue + "44" : overallWinner === redLabel ? TEAM_COLOR.red + "44" : "#a78bfa44"}`,
          }}>
            <div className="text-xs font-bold mb-1" style={{ color: "var(--text-dim)" }}>최종 예측</div>
            {overallWinner ? (
              <>
                <div className="text-sm font-black" style={{ color: overallWinner === blueLabel ? TEAM_COLOR.blue : TEAM_COLOR.red }}>
                  🏆 {overallWinner}님 {overallGap >= 6 ? "압승" : overallGap >= 3 ? "우세" : "소폭 유리"}
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {keyMatchText} 종합 스코어 {overallWinner === blueLabel ? overallBlue : overallRed}:{overallWinner === blueLabel ? overallRed : overallBlue}로 {overallWinner}님이 유리합니다.
                </p>
              </>
            ) : (
              <>
                <div className="text-sm font-black" style={{ color: "#a78bfa" }}>🤝 완전 박빙</div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {keyMatchText} 데이터상 어느 팀도 압도적인 우위를 보이지 않아 예측이 불가합니다.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 월즈 에디션 카드 ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>🃏 월즈 에디션 카드</div>
          {!currentWinner ? (
            <button onClick={() => setShowPicker(p => !p)}
              className="text-xs px-3 py-1 rounded-lg font-bold"
              style={{ background: "var(--accent)", color: "#fff" }}>
              🏆 우승팀 확정
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: currentWinner.team === "blue" ? TEAM_COLOR.blue : TEAM_COLOR.red }}>
                🏆 {currentWinner.team === "blue" ? blueLabel : redLabel} 우승 확정
              </span>
              <button onClick={cancelWinner}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "var(--hover)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
                취소
              </button>
            </div>
          )}
        </div>

        {/* 우승팀 선택 picker */}
        {showPicker && !currentWinner && (
          <div className="flex items-center gap-2 rounded-xl p-3 mb-3"
            style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>우승팀:</span>
            {(["blue", "red"] as DraftTeam[]).map(t => (
              <button key={t} onClick={() => confirmWinner(t)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: TEAM_COLOR[t] + "22", color: TEAM_COLOR[t], border: `1px solid ${TEAM_COLOR[t]}44` }}>
                🏆 {t === "blue" ? blueLabel : redLabel}
              </button>
            ))}
            <button onClick={() => setShowPicker(false)}
              className="text-xs px-2 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: "var(--hover)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
              취소
            </button>
          </div>
        )}

        {/* 카드 갤러리 — 라인별 */}
        <div className="space-y-3">
          {/* 팀 헤더 */}
          <div className="grid grid-cols-2 gap-2 pb-1" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="text-xs font-bold text-center" style={{ color: TEAM_COLOR.blue }}>🔵 {blueLabel}</div>
            <div className="text-xs font-bold text-center" style={{ color: TEAM_COLOR.red }}>🔴 {redLabel}</div>
          </div>
          {WORLDS_PAIRS.map(pair => {
            const bName = blueTeam.find(n => n === pair.p1 || n === pair.p2);
            const rName = redTeam.find(n => n === pair.p1 || n === pair.p2);
            const isWinBlue = currentWinner?.team === "blue";
            const isWinRed  = currentWinner?.team === "red";
            const bPast = bName ? seasonHistory.filter(h => h.blueTeam.includes(bName) || h.redTeam.includes(bName)).map(h => ({ won: h.team === "blue" ? h.blueTeam.includes(bName) : h.redTeam.includes(bName) })) : [];
            const rPast = rName ? seasonHistory.filter(h => h.blueTeam.includes(rName) || h.redTeam.includes(rName)).map(h => ({ won: h.team === "blue" ? h.blueTeam.includes(rName) : h.redTeam.includes(rName) })) : [];
            return (
              <div key={pair.pos}>
                <div className="flex items-center gap-1 mb-1.5">
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{pair.icon}</span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 700 }}>{pair.pos}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-center">
                    {bName
                      ? <WorldsPlayerCard name={bName} stats={statsMap[bName]} team="blue" isWinner={isWinBlue} pastRounds={bPast} posMvpAce={posMvpAceMap[bName]} champPool={champPoolMap[bName]} />
                      : <div className="rounded-xl flex items-center justify-center" style={{ width: 118, height: 60, background: "var(--hover)", border: "1px dashed var(--border)", color: "var(--text-dim)", fontSize: 11 }}>미정</div>
                    }
                  </div>
                  <div className="flex justify-center">
                    {rName
                      ? <WorldsPlayerCard name={rName} stats={statsMap[rName]} team="red" isWinner={isWinRed} pastRounds={rPast} posMvpAce={posMvpAceMap[rName]} champPool={champPoolMap[rName]} />
                      : <div className="rounded-xl flex items-center justify-center" style={{ width: 118, height: 60, background: "var(--hover)", border: "1px dashed var(--border)", color: "var(--text-dim)", fontSize: 11 }}>미정</div>
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 역대 기록 */}
        {seasonHistory.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-bold mb-2" style={{ color: "var(--text-dim)" }}>역대 기록</div>
            <div className="space-y-1.5">
              {seasonHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-dim)" }}>라운드 {i + 1} · {h.date}</span>
                  <span className="font-bold" style={{ color: h.team === "blue" ? TEAM_COLOR.blue : TEAM_COLOR.red }}>
                    🏆 {h.team === "blue" ? h.blueLabel : h.redLabel} 우승
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 포지션 매칭 카드 ── */}
      <div className="text-xs font-bold mb-2 tracking-wider" style={{ color: "var(--text-muted)" }}>포지션별 매칭</div>
      <div className="space-y-2 mb-4">
        {lanePreds.map(({ pair, bP, rP, pred }) => {
          const bS = statsMap[bP];
          const rS = statsMap[rP];
          const bWRObj = getDisplayWR(bP);
          const rWRObj = getDisplayWR(rP);
          const h2h = getH2H(bP, rP);
          const h2hTotal = h2h ? h2h.wins + h2h.losses : 0;
          const verdict = getVerdict(bP, rP);
          const bKDA = (bS?.kdaTotal?.games ?? 0) > 0 ? ((bS!.kdaTotal!.kills + bS!.kdaTotal!.assists) / Math.max(bS!.kdaTotal!.deaths, 1)).toFixed(1) : null;
          const rKDA = (rS?.kdaTotal?.games ?? 0) > 0 ? ((rS!.kdaTotal!.kills + rS!.kdaTotal!.assists) / Math.max(rS!.kdaTotal!.deaths, 1)).toFixed(1) : null;

          return (
            <div key={pair.pos} className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "var(--panel)" }}>

              {/* 포지션 헤더 */}
              <div className="flex items-center justify-between px-3 py-1.5"
                style={{ borderBottom: "1px solid var(--border)", background: "var(--hover)" }}>
                <span className="font-black text-xs" style={{ color: "var(--accent)" }}>{pair.icon} {pair.pos}</span>
                <div className="flex items-center gap-2">
                  {verdict && (
                    <span className="font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: verdict.color + "22", color: verdict.color, fontSize: 10 }}>
                      {verdict.favor ? (verdict.favor === "blue" ? blueLabel : redLabel) + " " : ""}{verdict.label}
                    </span>
                  )}
                  {h2hTotal > 0 && (
                    <div className="flex items-center gap-1" style={{ fontSize: 10 }}>
                      <span className="font-bold" style={{ color: TEAM_COLOR.blue }}>{h2h!.wins}</span>
                      <span style={{ color: "var(--text-dim)" }}>:</span>
                      <span className="font-bold" style={{ color: TEAM_COLOR.red }}>{h2h!.losses}</span>
                      <span style={{ color: "var(--text-dim)" }}>상대전적</span>
                    </div>
                  )}
                  {h2hTotal === 0 && <span style={{ color: "var(--text-dim)", fontSize: 10 }}>상대전적 없음</span>}
                </div>
              </div>

              {/* 선수 2열 */}
              <div className="grid grid-cols-[1fr,auto,1fr]">
                {/* 블루 선수 */}
                <div className="p-2" style={{ background: `${TEAM_COLOR.blue}06` }}>
                  <div className="flex items-center gap-1 mb-1 flex-wrap">
                    <span className="text-xs font-black" style={{ color: "var(--text)" }}>{bP}</span>
                    {(posMvpAceMap[bP]?.mvp ?? 0) > 0 && <span className="px-1 rounded" style={{ background: "#f59e0b22", color: "#f59e0b", fontSize: 9 }}>MVP {posMvpAceMap[bP].mvp}</span>}
                    {(posMvpAceMap[bP]?.ace ?? 0) > 0 && <span className="px-1 rounded" style={{ background: "#a78bfa22", color: "#a78bfa", fontSize: 9 }}>ACE {posMvpAceMap[bP].ace}</span>}
                  </div>
                  {bWRObj !== null ? (
                    <div className="text-base font-black" style={{ color: WRColor(bWRObj.wr) }}>{bWRObj.wr}%</div>
                  ) : (
                    <div className="text-base font-black" style={{ color: "var(--text-dim)" }}>—</div>
                  )}
                  {(bS?.totalGames ?? 0) > 0 && <div style={{ color: "var(--text-dim)", fontSize: 10 }}>{bS!.wins}승 {bS!.losses}패</div>}
                  {bKDA && <div style={{ color: "var(--text-dim)", fontSize: 10 }}>KDA {bKDA}</div>}
                  {(bS?.currentStreak ?? 0) >= 2 && <div className="font-bold mt-1" style={{ color: "#f59e0b", fontSize: 10 }}>🔥 {bS!.currentStreak}연승</div>}
                  {(bS?.currentStreak ?? 0) <= -2 && <div className="mt-1" style={{ color: "#6b7280", fontSize: 10 }}>❄️ {Math.abs(bS!.currentStreak)}연패</div>}
                </div>

                {/* 중앙 */}
                <div className="flex items-center justify-center px-1.5"
                  style={{ borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: 10, fontWeight: 900 }}>vs</span>
                </div>

                {/* 레드 선수 */}
                <div className="p-2 text-right" style={{ background: `${TEAM_COLOR.red}06` }}>
                  <div className="flex items-center justify-end gap-1 mb-1 flex-wrap">
                    {(posMvpAceMap[rP]?.ace ?? 0) > 0 && <span className="px-1 rounded" style={{ background: "#a78bfa22", color: "#a78bfa", fontSize: 9 }}>ACE {posMvpAceMap[rP].ace}</span>}
                    {(posMvpAceMap[rP]?.mvp ?? 0) > 0 && <span className="px-1 rounded" style={{ background: "#f59e0b22", color: "#f59e0b", fontSize: 9 }}>MVP {posMvpAceMap[rP].mvp}</span>}
                    <span className="text-xs font-black" style={{ color: "var(--text)" }}>{rP}</span>
                  </div>
                  {rWRObj !== null ? (
                    <div className="text-base font-black" style={{ color: WRColor(rWRObj.wr) }}>{rWRObj.wr}%</div>
                  ) : (
                    <div className="text-base font-black" style={{ color: "var(--text-dim)" }}>—</div>
                  )}
                  {(rS?.totalGames ?? 0) > 0 && <div style={{ color: "var(--text-dim)", fontSize: 10 }}>{rS!.wins}승 {rS!.losses}패</div>}
                  {rKDA && <div style={{ color: "var(--text-dim)", fontSize: 10 }}>KDA {rKDA}</div>}
                  {(rS?.currentStreak ?? 0) >= 2 && <div className="font-bold mt-1" style={{ color: "#f59e0b", fontSize: 10 }}>🔥 {rS!.currentStreak}연승</div>}
                  {(rS?.currentStreak ?? 0) <= -2 && <div className="mt-1" style={{ color: "#6b7280", fontSize: 10 }}>❄️ {Math.abs(rS!.currentStreak)}연패</div>}
                </div>
              </div>

              {/* 우세 바 */}
              {bWRObj !== null && rWRObj !== null && (() => {
                const t = bWRObj.wr + rWRObj.wr;
                const bp = t > 0 ? Math.round(bWRObj.wr / t * 100) : 50;
                return (
                  <div className="px-3 pb-2 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="h-1 rounded-full overflow-hidden flex">
                      <div style={{ width: `${bp}%`, background: TEAM_COLOR.blue }} />
                      <div style={{ flex: 1, background: TEAM_COLOR.red }} />
                    </div>
                  </div>
                );
              })()}

              {/* AI 라인 예측 */}
              <div className="px-3 py-2.5" style={{ borderTop: "1px solid var(--border)", background: "var(--hover)" }}>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold flex-shrink-0 px-1.5 py-0.5 rounded-full"
                    style={{ background: "#8b5cf622", color: "#8b5cf6", fontSize: 10 }}>🤖 AI</span>
                  <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {pred.sentences.length > 0
                      ? pred.sentences.join(" ")
                      : "데이터가 부족해 예측이 어렵습니다."
                    }
                    {" "}
                    <span className="font-bold" style={{
                      color: pred.winner === bP ? TEAM_COLOR.blue : pred.winner === rP ? TEAM_COLOR.red : "#a78bfa"
                    }}>
                      {pred.winner
                        ? `→ ${pred.winner}님 예측 승 🎯`
                        : "→ 예측 불가 😅"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ─── 가이드 탭 ────────────────────────────────────────────────────────────────

function GuideSection({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`guide-${num}`} className="mb-10" style={{ scrollMarginTop: "80px" }}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-black" style={{ color: "var(--accent)" }}>{num}</span>
        <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>{title}</h3>
      </div>
      <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: "1rem" }}>
        {children}
      </div>
    </section>
  );
}

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-bold mb-1.5" style={{ color: "var(--text)" }}>{title}</p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{children}</p>
    </div>
  );
}

function WarnCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#fef2f233", border: "1px solid #ef444444" }}>
      <p className="text-sm font-bold mb-1.5" style={{ color: "#ef4444" }}>{title}</p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{children}</p>
    </div>
  );
}

function InfoTable({ rows }: { rows: { label: string; value: React.ReactNode; sub?: string }[] }) {
  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: "1px solid var(--border)" }}>
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-4 px-4 py-3"
          style={{ background: i % 2 === 0 ? "var(--panel)" : "var(--panel-alt)", borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
          <span className="text-sm font-bold flex-shrink-0 w-20" style={{ color: "var(--text)" }}>{row.label}</span>
          <div>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>{row.value}</span>
            {row.sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{row.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function GuideTab() {
  return (
    <div className="max-w-2xl mx-auto py-4">

      {/* 커버 */}
      <div className="rounded-2xl p-8 mb-10 text-center"
        style={{ background: "linear-gradient(160deg, #1a3a1a, #0d1f0d)", border: "1px solid #2a5c2a" }}>
        <p className="text-xs tracking-widest font-bold mb-2" style={{ color: "#c8a951" }}>
          2026 WINTER · YEOSU
        </p>
        <h2 className="text-2xl font-black mb-1" style={{ color: "#fff" }}>
          제2회 나뭇잎 마을<br />월드 챔피언십
        </h2>
        <p className="text-xs tracking-widest mt-1 mb-4" style={{ color: "#a0b090" }}>
          THE 2ND KONOHA WORLDS
        </p>
        <p className="text-sm font-semibold" style={{ color: "#c8a951" }}>
          — 단 하나의 왕좌, 열두 명의 닌자 —
        </p>
        <div className="flex justify-center gap-4 mt-4 text-xs" style={{ color: "#6a8060" }}>
          <span>개최지 · 여수시</span>
          <span>·</span>
          <span>기간 · 12월 28일 ~ 30일</span>
          <span>·</span>
          <span>참가 · 코치 2명 · 선수 10명</span>
        </div>
      </div>

      {/* 목차 */}
      <div className="rounded-2xl mb-10 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f1f0f, #141f14)", border: "1px solid #2a5c2a44" }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs tracking-widest font-bold mb-1" style={{ color: "#c8a951" }}>TABLE OF CONTENTS</p>
          <p className="text-sm font-black" style={{ color: "#e8e8e8" }}>목 차</p>
        </div>
        <div style={{ borderTop: "1px solid #2a5c2a66" }}>
          {[
            { num: "01", title: "서문" },
            { num: "02", title: "월즈의 역사" },
            { num: "03", title: "대회 개요" },
            { num: "04", title: "팀 구성" },
            { num: "05", title: "준비 기간" },
            { num: "06", title: "결승전 방식" },
            { num: "07", title: "경기 규칙" },
            { num: "08", title: "시상" },
            { num: "09", title: "맺음말" },
          ].map(({ num, title }, i, arr) => (
            <a key={num} href={`#guide-${num}`}
              className="flex items-center justify-between px-5 py-3 group transition-colors"
              style={{
                borderBottom: i < arr.length - 1 ? "1px solid #2a5c2a33" : undefined,
                textDecoration: "none",
                background: "transparent",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2a5c2a22")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div className="flex items-center gap-3">
                <span className="font-black tabular-nums" style={{ fontSize: 12, color: "#c8a951", minWidth: 24 }}>{num}</span>
                <span className="text-sm font-semibold" style={{ color: "#c8d8c0" }}>{title}</span>
              </div>
              <span style={{ color: "#2a5c2a", fontSize: 12 }}>›</span>
            </a>
          ))}
        </div>
      </div>

      {/* 01 서문 */}
      <GuideSection num="01" title="서문">
        <div className="rounded-xl p-5" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
            나뭇잎 마을의 역사 속에서 수많은 내전이 치러졌으나, 오직 한 번의 무대만이 &ldquo;월즈&rdquo;라는 이름을 허락받는다.
          </p>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
            지난겨울, 첫 번째 월즈가 막을 내리고 나뭇잎 마을에 첫 챔피언이 탄생했다. 그리고 1년이 지난 올겨울, 12인의 닌자가 빛고을 광주에 집결한다. 2명의 코치와 10명의 선수는 두 개의 군단으로 나뉘어 준비의 시간을 거친 뒤, 단 한 번의 결전으로 나뭇잎 마을 최강의 자리를 가린다.
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            승자는 영광을, 패자는 다음 겨울을 기약하게 될 것이다.
          </p>
        </div>
      </GuideSection>

      {/* 02 월즈의 역사 */}
      <GuideSection num="02" title="월즈의 역사">
        <div className="rounded-xl p-5 text-center"
          style={{ background: "linear-gradient(160deg, #78620022, #3a300011)", border: "1px solid #c8a95144" }}>
          <p className="text-xs font-bold mb-2" style={{ color: "#c8a951" }}>🏆 제1회 월즈 · 작년 겨울</p>
          <p className="text-xl font-black mb-3" style={{ color: "var(--text)" }}>초대 챔피언</p>
          <p className="text-base font-bold" style={{ color: "#c8a951" }}>
            민수 · 성태 · 문강 · 승주 · 만슥
          </p>
        </div>
        <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--text-muted)" }}>
          나뭇잎 마을 최초의 월즈에서 다섯 닌자가 하나의 팀으로 정상에 올랐다. 이들의 이름은 초대 챔피언으로 역사에 새겨졌으며, 이제 그 왕좌를 향한 두 번째 도전이 시작된다.
        </p>
      </GuideSection>

      {/* 03 대회 개요 */}
      <GuideSection num="03" title="대회 개요">
        <InfoTable rows={[
          { label: "대회명",   value: "제2회 나뭇잎 마을 월드 챔피언십", sub: "(The 2nd Konoha Worlds)" },
          { label: "개최지",   value: "여수시" },
          { label: "기간",     value: "12월 28일 ~ 30일" },
          { label: "참가 인원", value: "총 12명 (코치 2명, 선수 10명)" },
          { label: "참가 팀",  value: "2개 팀 (팀당 코치 1명, 선수 5명)" },
        ]} />
      </GuideSection>

      {/* 04 팀 구성 */}
      <GuideSection num="04" title="팀 구성">
        <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
          양 팀의 구성은 대회 전 <strong style={{ color: "var(--text)" }}>디스코드 소집 회의</strong>를 통해 결정한다. 회의 일정은 추후 공지한다.
        </p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
          결정된 명단은 최종 로스터로 확정되어 대회 종료까지 변경할 수 없다. 각 팀은 팀명과 엠블럼을 자유롭게 정할 수 있다.
        </p>
        <WarnCard title="⚠ 약코 금지 안내">
          팀 구성 과정에서 의도적으로 실력을 낮춰 보이거나 못하는 척하여 유리한 편성을 얻으려는 행위, 이른바 <strong>&apos;약코&apos;</strong>는 월즈의 정신을 훼손하는 행위로 엄격히 금지한다.<br /><br />
          나뭇잎 마을의 모든 닌자는 자신의 실력을 있는 그대로 드러내야 하며, 약코 정황이 확인될 경우 코치진 합의하에 팀 구성을 재조정할 수 있다. 진정한 챔피언은 공정한 무대 위에서만 탄생한다.
        </WarnCard>
      </GuideSection>

      {/* 05 준비 기간 */}
      <GuideSection num="05" title="준비 기간">
        <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
          로스터 확정 이후부터 결전 당일까지를 공식 준비 기간으로 한다. 각 팀 코치는 이 기간 동안 전략 회의, 연습 경기, 챔피언 폭 점검 등을 주관한다.
        </p>
        <div className="rounded-xl p-4" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>💡 권장사항</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            피어리스 드래프트에 대비해 선수별로 <strong style={{ color: "var(--text)" }}>다양한 챔피언을 준비</strong>할 것을 권장한다.
          </p>
        </div>
      </GuideSection>

      {/* 06 결승전 방식 */}
      <GuideSection num="06" title="결승전 방식">
        <div className="rounded-xl p-6 text-center mb-3"
          style={{ background: "linear-gradient(160deg, #c8a95122, #78620011)", border: "1px solid #c8a95144" }}>
          <p className="text-4xl font-black mb-1" style={{ color: "var(--accent)" }}>5판 3선승제</p>
          <p className="text-xs tracking-widest" style={{ color: "var(--text-dim)" }}>BEST OF FIVE · 대회 1일차</p>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          실제 월즈 녹아웃 스테이지와 같은 방식으로 진행한다. 먼저 3세트를 따낸 팀이 <strong style={{ color: "var(--text)" }}>제2회 나뭇잎 마을 월즈 챔피언</strong>의 칭호를 얻는다.
        </p>
      </GuideSection>

      {/* 07 경기 규칙 */}
      <GuideSection num="07" title="경기 규칙">
        <RuleCard title="① 피어리스 드래프트">
          2025 월즈부터 적용된 규칙을 따른다. 한 세트에서 어느 팀이든 사용한 챔피언은 시리즈의 남은 세트에서 양 팀 모두 선택할 수 없다.
        </RuleCard>
        <RuleCard title="② 밴픽 방식">
          토너먼트 드래프트 모드로 진행하며, 각 팀은 세트당 5개의 챔피언을 금지한다. 밴픽 단계에서는 코치가 선수들과 의견을 나눌 수 있다.
        </RuleCard>
        <RuleCard title="③ 진영 선택">
          1세트 진영은 코인 토스로 결정하며, 이긴 팀이 블루 또는 레드를 선택한다. 2세트부터는 직전 세트 패배 팀이 진영을 선택한다.
        </RuleCard>
        <RuleCard title="④ 코치 규정">
          경기 시작 이후 코치는 전략적 지시를 할 수 없으며, 세트와 세트 사이에만 피드백을 전달할 수 있다.
        </RuleCard>
        <RuleCard title="⑤ 퍼즈 및 재경기">
          인터넷 끊김, 기기 문제 등 기술적 문제가 발생한 경우에만 퍼즈를 사용할 수 있다. 게임 시작 직후 심각한 문제가 생기면 양 팀 코치 합의하에 재경기를 진행한다.
        </RuleCard>
        <RuleCard title="⑥ 매너 규정">
          승패와 관계없이 상대를 존중하는 스포츠맨십을 지킨다. 결전이 끝난 뒤에는 모두가 다시 같은 마을의 동료다.
        </RuleCard>
      </GuideSection>

      {/* 08 시상 */}
      <GuideSection num="08" title="시상">
        <InfoTable rows={[
          { label: "우승팀",     value: "제2회 나뭇잎 마을 월즈 챔피언 칭호", sub: "우승 상품 추후 결정" },
          { label: "파이널 MVP", value: "시리즈에서 가장 빛난 선수 1명 (전원 투표로 선정)" },
          { label: "기록 등재",  value: "모든 경기 결과는 나뭇잎 마을 내전 기록소 (KONOHA STATS)에 영구 보존" },
        ]} />
        <div className="rounded-xl p-4" style={{ background: "linear-gradient(160deg, #7c3aed22, #3730a322)", border: "1px solid #7c3aed44" }}>
          <p className="text-sm font-bold" style={{ color: "#a78bfa" }}>
            ★ 파이널 MVP만을 위한 리미티드 업적 수여
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
            파이널 MVP에게는 나뭇잎 마을 내전 기록소 내 단 한 명만 보유할 수 있는 특별 칭호가 부여됩니다.
          </p>
        </div>
      </GuideSection>

      {/* 09 맺음말 */}
      <GuideSection num="09" title="맺음말">
        <div className="rounded-xl p-6 text-center"
          style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
          <p className="text-sm leading-loose" style={{ color: "var(--text-muted)" }}>
            한 해의 끝, 여수의 겨울 바다 아래에서<br />
            새로운 전설이 쓰인다.<br /><br />
            준비한 자만이 살아남고,<br />
            포기하지 않는 자만이 왕좌에 오른다.<br /><br />
            나뭇잎 마을의 모든 닌자여,<br />
            결전의 날에 가장 뜨거운 모습으로 만나자.
          </p>
          <p className="text-lg font-black mt-5" style={{ color: "#ef4444" }}>
            불의 의지는 꺼지지 않는다 🔥
          </p>
        </div>
      </GuideSection>

    </div>
  );
}

// ─── 여정 탭 ─────────────────────────────────────────────────────────────────

const JOURNEY_MILESTONES: {
  date: string;
  icon: string;
  title: string;
  desc: string;
  done: boolean;
  color: string;
  tag?: string;
}[] = [
  {
    date: "2026-10-21",
    icon: "🏆",
    title: "제2회 월즈 공식 발표",
    desc: "나뭇잎 마을 제2회 월드 챔피언십이 여수에서 개최됨을 공식 선언했다. 12명의 닌자가 도전의 문 앞에 섰다.",
    done: true,
    color: "#c8a951",
    tag: "발표",
  },
  {
    date: "미정",
    icon: "📋",
    title: "참가 신청 마감",
    desc: "12명의 닌자가 도전장을 제출했다. 각자의 각오를 품고, 이름을 올렸다.",
    done: false,
    color: "#42a5f5",
    tag: "참가",
  },
  {
    date: "미정",
    icon: "⚔️",
    title: "팀 구성 드래프트",
    desc: "2명의 코치가 10명의 선수를 나누어 두 개의 군단을 완성한다. 이 순간부터 우리는 팀이다.",
    done: false,
    color: "#ef5350",
    tag: "드래프트",
  },
  {
    date: "미정",
    icon: "🔥",
    title: "준비 기간 시작",
    desc: "로스터 확정 이후 실전 준비가 시작된다. 챔피언 폭을 넓히고 전략을 다듬는 시간.",
    done: false,
    color: "#ff9800",
    tag: "스크림",
  },
  {
    date: "2026-12-28",
    icon: "🌟",
    title: "월즈 개막 — 결전의 날",
    desc: "여수의 겨울 바다 아래, 최강의 닌자가 가려진다. 준비한 자만이 이 무대에 설 자격이 있다.",
    done: false,
    color: "#00e5ff",
    tag: "D-Day",
  },
];

function JourneyTab() {
  const WORLDS_DATE = new Date("2026-12-28T00:00:00");
  const ANNOUNCE_DATE = new Date("2026-10-21T00:00:00");
  const now = new Date();

  const [milestones, setMilestones] = useState<typeof JOURNEY_MILESTONES>(() => {
    try {
      const saved = localStorage.getItem("journey-milestones");
      return saved ? JSON.parse(saved) : JOURNEY_MILESTONES;
    } catch { return JOURNEY_MILESTONES; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState({ date: "", icon: "📌", title: "", desc: "", color: "#c8a951", tag: "", done: false });

  const BLANK_FORM = { date: "", icon: "📌", title: "", desc: "", color: "#c8a951", tag: "", done: false };

  function openAdd() {
    setEditingIndex(null);
    setForm(BLANK_FORM);
    setShowForm(true);
  }

  function openEdit(i: number) {
    setEditingIndex(i);
    const m = milestones[i];
    setForm({ date: m.date, icon: m.icon, title: m.title, desc: m.desc, color: m.color, tag: m.tag ?? "", done: m.done });
    setShowForm(true);
  }

  function saveForm() {
    if (!form.title.trim()) return;
    const next = editingIndex === null
      ? [...milestones, { ...form }]
      : milestones.map((m, i) => i === editingIndex ? { ...form } : m);
    setMilestones(next);
    try { localStorage.setItem("journey-milestones", JSON.stringify(next)); } catch {}
    setForm(BLANK_FORM);
    setEditingIndex(null);
    setShowForm(false);
  }

  function deleteItem(i: number) {
    const next = milestones.filter((_, idx) => idx !== i);
    setMilestones(next);
    try { localStorage.setItem("journey-milestones", JSON.stringify(next)); } catch {}
  }

  const daysTotal = Math.round((WORLDS_DATE.getTime() - ANNOUNCE_DATE.getTime()) / 86400000);
  const daysPassed = Math.max(0, Math.round((now.getTime() - ANNOUNCE_DATE.getTime()) / 86400000));
  const daysLeft = Math.max(0, Math.round((WORLDS_DATE.getTime() - now.getTime()) / 86400000));
  const progress = Math.min(100, Math.round((daysPassed / daysTotal) * 100));
  const isPast = now >= WORLDS_DATE;

  return (
    <div className="space-y-8 pb-8">
      {/* 상단 여정 요약 카드 */}
      <div className="rounded-2xl p-6"
        style={{ background: "linear-gradient(160deg, #1a3a1a, #0d1f0d)", border: "1px solid #2a5c2a" }}>
        <p className="text-xs tracking-widest font-bold mb-1" style={{ color: "#c8a951" }}>
          월즈의 여정
        </p>
        <h2 className="text-xl font-black mb-4" style={{ color: "#fff" }}>
          {isPast ? "우리는 해냈다" : "결전을 향해 나아가는 중"}
        </h2>

        {/* 진행률 바 */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#6a8060" }}>
            <span>발표일 · 10월 21일</span>
            <span>월즈 · 12월 28일</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#0d2a0d" }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #2a7c2a, #c8a951)" }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5" style={{ color: "#6a8060" }}>
            <span>{daysPassed}일 경과</span>
            <span style={{ color: "#c8a951", fontWeight: 700 }}>{progress}%</span>
            <span>{daysLeft}일 남음</span>
          </div>
        </div>

        {/* 요약 수치 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "준비 기간", value: `${daysTotal}일`, sub: "발표~월즈" },
            { label: "경과 일수", value: `${daysPassed}일`, sub: "현재까지" },
            { label: "D-Day", value: isPast ? "완료" : `D-${daysLeft}`, sub: "12월 28일" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #2a5c2a44" }}>
              <div className="text-xs mb-1" style={{ color: "#6a8060" }}>{s.label}</div>
              <div className="font-black text-lg" style={{ color: "#c8a951" }}>{s.value}</div>
              <div className="text-[10px]" style={{ color: "#4a6040" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 타임라인 */}
      <div>
        <p className="text-xs font-bold tracking-widest mb-5" style={{ color: "var(--text-dim)" }}>
          TIMELINE
        </p>

        <div className="relative">
          {/* 세로 라인 — top-[23px]: dot center (mt-1=4px + half of 38px dot) */}
          <div className="absolute left-[19px] top-[23px] bottom-0 w-0.5"
            style={{ background: "linear-gradient(to bottom, var(--accent), transparent)" }} />

          <div className="space-y-0">
            {milestones.map((m, i) => (
              <div key={i} className="relative flex gap-4 pb-8">
                {/* 타임라인 도트 */}
                <div className="relative z-10 flex-shrink-0 mt-1"
                  style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="rounded-full flex items-center justify-center text-lg"
                    style={{
                      width: 38,
                      height: 38,
                      background: m.done ? m.color + "22" : "var(--panel)",
                      border: `2px solid ${m.done ? m.color : "var(--border)"}`,
                      filter: m.done ? `drop-shadow(0 0 6px ${m.color}44)` : "none",
                    }}>
                    {m.icon}
                  </div>
                </div>

                {/* 카드 */}
                <div className="flex-1 rounded-xl p-4 transition-all"
                  style={{
                    background: m.done ? m.color + "0d" : "var(--panel)",
                    border: `1px solid ${m.done ? m.color + "44" : "var(--border)"}`,
                  }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-black text-sm" style={{ color: m.done ? m.color : "var(--text)" }}>
                      {m.title}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {m.tag && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: m.color + "22", color: m.color, border: `1px solid ${m.color}44` }}>
                          {m.tag}
                        </span>
                      )}
                      <button onClick={() => openEdit(i)}
                        className="text-[10px] px-1.5 py-0.5 rounded opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-muted)", background: "var(--hover)" }}>
                        ✏️
                      </button>
                      <button onClick={() => deleteItem(i)}
                        className="text-[10px] px-1.5 py-0.5 rounded opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: "#ef5350", background: "#ef535011" }}>
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>
                    🗓️ {m.date}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: m.done ? "var(--text-muted)" : "var(--text-dim)" }}>
                    {m.desc}
                  </p>
                  {m.done && (
                    <div className="mt-2 text-[10px] font-bold" style={{ color: m.color }}>
                      ✓ 완료
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 항목 추가 버튼 */}
          {!showForm ? (
            <button
              onClick={openAdd}
              className="mt-4 ml-14 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{ color: "var(--accent)", background: "var(--hover)", border: "1px dashed var(--accent)" }}>
              + 항목 추가
            </button>
          ) : (
            <div className="mt-4 ml-14 rounded-xl p-4 space-y-3"
              style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                {editingIndex === null ? "새 타임라인 항목" : "항목 수정"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="날짜 (예: 2026-11-01 또는 미정)"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="col-span-2 rounded-lg px-3 py-2 text-xs"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input
                  placeholder="아이콘 (이모지)"
                  value={form.icon}
                  onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  className="rounded-lg px-3 py-2 text-xs"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input
                  placeholder="태그 (예: 발표)"
                  value={form.tag}
                  onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                  className="rounded-lg px-3 py-2 text-xs"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input
                  placeholder="제목"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="col-span-2 rounded-lg px-3 py-2 text-xs"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <textarea
                  placeholder="설명"
                  value={form.desc}
                  onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                  rows={2}
                  className="col-span-2 rounded-lg px-3 py-2 text-xs resize-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <div className="flex items-center gap-2">
                  <label className="text-xs" style={{ color: "var(--text-dim)" }}>색상</label>
                  <input type="color" value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer" />
                </div>
                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-dim)" }}>
                  <input type="checkbox" checked={form.done}
                    onChange={e => setForm(f => ({ ...f, done: e.target.checked }))} />
                  완료된 항목
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveForm}
                  className="text-xs font-bold px-4 py-1.5 rounded-lg"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  {editingIndex === null ? "추가" : "저장"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingIndex(null); setForm(BLANK_FORM); }}
                  className="text-xs font-bold px-4 py-1.5 rounded-lg"
                  style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 맺음 메시지 */}
      <div className="rounded-2xl p-6 text-center"
        style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
        <p className="text-sm leading-loose" style={{ color: "var(--text-muted)" }}>
          이 페이지를 처음 보는 그날,<br />
          우리는 아직 시작 전이었다.<br /><br />
          하지만 언젠가 다시 돌아와 이 여정을 읽을 때,<br />
          그 모든 준비의 날들이 얼마나 소중했는지를 알게 될 것이다.
        </p>
        <p className="text-base font-black mt-4" style={{ color: "var(--accent)" }}>
          — 나뭇잎 마을의 겨울 🌿
        </p>
      </div>
    </div>
  );
}

// ─── 스크림 탭 ────────────────────────────────────────────────────────────────

function ScrimTab() {
  const [records, setRecords] = useState<import("@/lib/types").GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@/lib/stats").then(({ loadGameRecords }) => {
      loadGameRecords().then(data => {
        setRecords(data.filter(r => r.category === "스크림"));
        setLoading(false);
      });
    });
  }, []);

  if (loading) {
    return <div className="py-16 text-center" style={{ color: "var(--text-muted)" }}>불러오는 중...</div>;
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-4xl">📊</div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>스크림으로 분류된 경기 기록이 없습니다.</p>
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>AI 분석 페이지에서 경기 유형을 &quot;스크림&quot;으로 설정하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  // 날짜별 그룹
  const groups: Record<string, typeof records> = {};
  for (const r of records) {
    if (!groups[r.date]) groups[r.date] = [];
    groups[r.date].push(r);
  }
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const teamWins = (recs: typeof records) => {
    const t1 = recs.filter(r => r.winTeam === 1).length;
    const t2 = recs.filter(r => r.winTeam === 2).length;
    return { t1, t2 };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-black text-base" style={{ color: "var(--accent)" }}>스크림 기록</h3>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>총 {records.length}경기 · {sortedDates.length}일</span>
      </div>
      {sortedDates.map(date => {
        const recs = groups[date];
        const { t1, t2 } = teamWins(recs);
        const title = recs[0]?.title;
        return (
          <div key={date} className="p-4 rounded-xl" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--text)" }}>
                  {title ? <>{title} <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 12 }}>({date})</span></> : date}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
                  {recs[0]?.gameFormat} · {recs.length}경기
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black" style={{ color: t1 > t2 ? "var(--win)" : "var(--text-muted)" }}>팀1 {t1}</span>
                <span style={{ color: "var(--text-dim)", fontSize: 11 }}>:</span>
                <span className="text-xs font-black" style={{ color: t2 > t1 ? "var(--win)" : "var(--text-muted)" }}>{t2} 팀2</span>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap mt-1">
              {recs.sort((a, b) => a.gameNumber - b.gameNumber).map(r => (
                <span key={r.id} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: r.winTeam === 1 ? "var(--win)20" : "var(--loss)20",
                    color: r.winTeam === 1 ? "var(--win)" : "var(--loss)",
                    border: `1px solid ${r.winTeam === 1 ? "var(--win)" : "var(--loss)"}44`,
                  }}>
                  {r.gameNumber}경기 {r.winTeam === 1 ? "팀1 승" : "팀2 승"}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function WorldsPage() {
  const [tab, setTab] = useState<Tab>("dday");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black tracking-widest mb-1" style={{ color: "var(--accent)" }}>
          🌍 WORLDS
        </h1>
        <p className="text-xs font-semibold tracking-widest" style={{ color: "var(--text-dim)" }}>
          THE 2ND KONOHA WORLDS · 2026 WINTER · YEOSU
        </p>
      </div>

      {/* 탭 */}
      <div className="flex mb-4 sm:mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all relative"
            style={{
              color: tab === t.key ? "var(--accent-light)" : "var(--text-muted)",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            }}>
            <span className="text-base sm:text-sm">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>
      {/* 모바일: 현재 탭 이름 표시 */}
      <div className="sm:hidden text-center text-xs font-bold mb-4" style={{ color: "var(--accent)" }}>
        {TABS.find(t => t.key === tab)?.icon} {TABS.find(t => t.key === tab)?.label}
      </div>

      {/* 탭 컨텐츠 */}
      {tab === "dday"    && <DDayTab />}
      {tab === "draft"   && <DraftTab />}
      {tab === "players" && <PlayersTab />}
      {tab === "guide"   && <GuideTab />}
      {tab === "scrim"   && <ScrimTab />}
      {tab === "journey" && <JourneyTab />}
    </div>
  );
}
