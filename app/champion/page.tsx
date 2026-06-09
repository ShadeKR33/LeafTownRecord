"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadGameRecords, loadNicknames, normalizeId } from "@/lib/stats";
import type { GameRecord } from "@/lib/types";
import { ChampionPortrait } from "@/components/ChampionPortrait";
import GuideBanner from "@/components/GuideBanner";

export const POSITIONS = ["탑", "정글", "미드", "원딜", "서포터"] as const;
export type Position = (typeof POSITIONS)[number];
export type Tier = 1 | 2 | 3 | 4 | 5;

const ROLE_COLORS: Record<Position, string> = {
  탑: "#e06060", 정글: "#50a050", 미드: "#5090d0", 원딜: "#c0a030", 서포터: "#9060c0",
};

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; desc: string }> = {
  1: { label: "1티어", color: "#ef4444", bg: "#fef2f2", desc: "압도적 강세" },
  2: { label: "2티어", color: "#f97316", bg: "#fff7ed", desc: "강력한 픽" },
  3: { label: "3티어", color: "#eab308", bg: "#fefce8", desc: "준수한 픽" },
  4: { label: "4티어", color: "#6366f1", bg: "#eef2ff", desc: "약세 픽" },
  5: { label: "5티어", color: "#94a3b8", bg: "#f8fafc", desc: "하위 픽" },
};

export interface ChampTierStat {
  champion: string;
  position: Position;
  wins: number;
  losses: number;
  picks: number;
  bans: number;
  totalGames: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  score: number;
  tier: Tier;
  forcedUp: boolean;
  penalized: boolean;
  isHoney: boolean;
  distinctPlayers: number;
}

export function computeScore(wr: number, pr: number, br: number): number {
  let s = 0;
  if (wr >= 0.70) s += 50; else if (wr >= 0.60) s += 40; else if (wr >= 0.55) s += 32;
  else if (wr >= 0.50) s += 24; else if (wr >= 0.45) s += 16; else s += 8;
  if (br >= 0.40) s += 35; else if (br >= 0.25) s += 28; else if (br >= 0.15) s += 20; else if (br >= 0.05) s += 12;
  if (pr >= 0.40) s += 15; else if (pr >= 0.20) s += 12; else if (pr >= 0.10) s += 8; else if (pr >= 0.05) s += 4;
  return s;
}

// ── 챔피언별 "평균 대비 상승폭" 계산 ──────────────────────────────
// 잘하는 사람이 픽해서 챔피언이 강해 보이는 왜곡을 보정한 승률
// delta = (그 챔피언으로의 승률) - (그 사람의 평소 전체 승률), 픽수로 가중 평균
// confidence = 서로 다른 사람이 많이 픽했을수록 신뢰도↑ (1명=0.34, 2명=0.67, 3명 이상=1.0)
// playerMap: `${nickname}|||${pos}|||${champion}` → 전적 / playerOverallMap: `${nickname}` → 전체 전적
export function computeRelativeWR(
  playerMap: Map<string, { wins: number; losses: number }>,
  playerOverallMap: Map<string, { wins: number; losses: number }>,
  pos: Position,
  champion: string,
  fallbackWR: number
): { adjWR: number; distinctPlayers: number } {
  const suffix = `|||${pos}|||${champion}`;
  let weightedDeltaSum = 0;
  let totalPicks = 0;
  let distinctPlayers = 0;
  playerMap.forEach((s, k) => {
    if (!k.endsWith(suffix)) return;
    const nickname = k.slice(0, k.length - suffix.length);
    const picks = s.wins + s.losses;
    if (picks < 1) return;
    const overall = playerOverallMap.get(nickname);
    const overallGames = overall ? overall.wins + overall.losses : 0;
    if (!overall || overallGames < 1) return;
    const champWR = s.wins / picks;
    const baselineWR = overall.wins / overallGames;
    weightedDeltaSum += picks * (champWR - baselineWR);
    totalPicks += picks;
    distinctPlayers++;
  });
  if (totalPicks === 0) return { adjWR: fallbackWR, distinctPlayers: 0 };
  const avgDelta = weightedDeltaSum / totalPicks;
  const confidence = Math.min(1, distinctPlayers / 3);
  const adjWR = Math.min(1, Math.max(0, 0.5 + avgDelta * confidence));
  return { adjWR, distinctPlayers };
}

// ── 포지션 내 상대적 티어 배분 ──────────────────────────────────
// 같은 포지션 챔피언들의 점수를 백분위로 나눠 1~5티어 배분
// forcedUp(밴율 강제)은 항상 1티어 유지
export function assignRelativeTiers(
  items: Array<{ score: number; forcedUp: boolean; penalized: boolean }>,
  position?: Position
): Tier[] {
  if (items.length === 0) return [];

  // 패널티 반영한 유효 점수
  const effScores = items.map(c => c.forcedUp ? 9999 : c.penalized ? c.score - 15 : c.score);

  // 고유 점수 내림차순 (동점자는 같은 티어)
  const unique = [...new Set(effScores)].sort((a, b) => b - a);
  const m = unique.length;

  return effScores.map(eff => {
    if (eff === 9999) return 1 as Tier;   // forcedUp
    if (m === 1) return 1 as Tier;        // 챔피언이 1개
    const rank = unique.indexOf(eff);     // 0 = 최상위
    const pct = rank / (m - 1);          // 0.0~1.0

    if (position === "탑") {
      // 탑 라인은 여전히 일반 기준보다는 엄격하지만, 기존보다 살짝 관대하게 (1티어: 상위 15%, 2티어: 상위 32%, 3티어: 상위 52%, 4티어: 상위 75%)
      if (pct <= 0.15) return 1 as Tier;
      if (pct <= 0.32) return 2 as Tier;
      if (pct <= 0.52) return 3 as Tier;
      if (pct <= 0.75) return 4 as Tier;
      return 5 as Tier;
    }

    if (position === "서포터") {
      // 서포터는 일반 기준보다 살짝 깐깐하게 (1티어: 상위 16%, 2티어: 상위 36%, 3티어: 상위 56%, 4티어: 상위 76%)
      if (pct <= 0.16) return 1 as Tier;
      if (pct <= 0.36) return 2 as Tier;
      if (pct <= 0.56) return 3 as Tier;
      if (pct <= 0.76) return 4 as Tier;
      return 5 as Tier;
    }

    if (pct <= 0.20) return 1 as Tier;
    if (pct <= 0.40) return 2 as Tier;
    if (pct <= 0.60) return 3 as Tier;
    if (pct <= 0.80) return 4 as Tier;
    return 5 as Tier;
  });
}

export default function ChampionPage() {
  const router = useRouter();
  const [tierData, setTierData] = useState<Record<Position, ChampTierStat[]>>({
    탑: [], 정글: [], 미드: [], 원딜: [], 서포터: [],
  });
  const [activePos, setActivePos] = useState<Position>("탑");
  const [loading, setLoading] = useState(true);
  const [totalGames, setTotalGames] = useState(0);

  // 모달 및 데이터 관리용 추가 상태
  const [nicknames, setNicknames] = useState<any[]>([]);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [selectedChampForModal, setSelectedChampForModal] = useState<{ champion: string; position: Position } | null>(null);

  // 마지막 선택 포지션 복원
  useEffect(() => {
    const saved = sessionStorage.getItem("champion-pos") as Position;
    if (saved && (POSITIONS as readonly string[]).includes(saved)) setActivePos(saved);
  }, []);

  const handleSetPos = (pos: Position) => {
    setActivePos(pos);
    sessionStorage.setItem("champion-pos", pos);
  };

  useEffect(() => {
    Promise.all([loadGameRecords(), loadNicknames()]).then(([loadedRecords, loadedNicknames]) => {
      setRecords(loadedRecords);
      setNicknames(loadedNicknames);

      if (loadedRecords.length === 0) { setLoading(false); return; }
      const total = loadedRecords.length;
      setTotalGames(total);

      const posChampMap = new Map<string, { wins: number; losses: number; picks: number }>();
      const playerMap   = new Map<string, { wins: number; losses: number }>();
      const playerOverallMap = new Map<string, { wins: number; losses: number }>();

      loadedRecords.forEach(r => {
        const process = (team: GameRecord["team1"], won: boolean) => {
          team.forEach((p, idx) => {
            if (!p.champion || p.champion === "?") return;
            const pos = POSITIONS[idx]; if (!pos) return;
            const gk = `${pos}|||${p.champion}`;
            if (!posChampMap.has(gk)) posChampMap.set(gk, { wins: 0, losses: 0, picks: 0 });
            const gs = posChampMap.get(gk)!;
            gs.picks++; if (won) gs.wins++; else gs.losses++;
            const pk = `${p.nickname}|||${gk}`;
            if (!playerMap.has(pk)) playerMap.set(pk, { wins: 0, losses: 0 });
            const ps = playerMap.get(pk)!;
            if (won) ps.wins++; else ps.losses++;
            // 플레이어 전체(챔피언 무관) 승률 — "이 사람의 평소 기량" 기준선
            if (!playerOverallMap.has(p.nickname)) playerOverallMap.set(p.nickname, { wins: 0, losses: 0 });
            const po = playerOverallMap.get(p.nickname)!;
            if (won) po.wins++; else po.losses++;
          });
        };
        process(r.team1, r.winTeam === 1);
        process(r.team2, r.winTeam === 2);
      });

      const banMap = new Map<string, number>();
      loadedRecords.forEach(r => {
        if (!r.bans) return;
        [...(r.bans.team1 || []), ...(r.bans.team2 || [])].forEach(c => {
          if (c) banMap.set(c, (banMap.get(c) || 0) + 1);
        });
      });

      const checkHoney = (pos: Position, champion: string, tier: Tier, overallWR: number): boolean => {
        if (tier !== 1 || overallWR < 0.52) return false;
        const suffix = `|||${pos}|||${champion}`;
        const players: { picks: number; wr: number }[] = [];
        playerMap.forEach((s, k) => {
          if (!k.endsWith(suffix)) return;
          const picks = s.wins + s.losses;
          if (picks >= 1) players.push({ picks, wr: picks > 0 ? s.wins / picks : 0 });
        });
        if (players.length < 2) return false;
        players.sort((a, b) => a.picks - b.picks);
        const half = Math.ceil(players.length / 2);
        const bWR = players.slice(0, half).reduce((s, p) => s + p.wr, 0) / half;
        const ep = players.slice(half);
        if (!ep.length) return false;
        const eWR = ep.reduce((s, p) => s + p.wr, 0) / ep.length;
        return Math.abs(eWR - bWR) < 0.20;
      };

      // 포지션별 데이터 수집
      const byPos: Record<Position, Array<{ champion: string; wins: number; losses: number; picks: number; bans: number; winRate: number; pickRate: number; banRate: number; score: number; forcedUp: boolean; penalized: boolean; distinctPlayers: number }>> = {
        탑: [], 정글: [], 미드: [], 원딜: [], 서포터: [],
      };

      posChampMap.forEach((s, key) => {
        const sep = key.indexOf("|||");
        const pos = key.slice(0, sep) as Position;
        const champion = key.slice(sep + 3);
        if (s.picks < 1) return; // 1픽 이상이면 포함
        const wr = s.wins / s.picks;
        const pr = s.picks / total;
        const bans = banMap.get(champion) || 0;
        const br = bans / total;
        // "잘하는 사람이 픽해서 챔피언이 강해 보이는" 왜곡을 보정한 승률로 점수/티어를 계산
        // (화면에 노출되는 승률 자체는 실제 W/L인 wr 그대로 유지)
        const { adjWR, distinctPlayers } = computeRelativeWR(playerMap, playerOverallMap, pos, champion, wr);
        const score = computeScore(adjWR, pr, br);
        const forcedUp = br > 0.25 && adjWR > 0.50;
        const penalized = pr < 0.10 && adjWR > 0.60;
        byPos[pos].push({ champion, wins: s.wins, losses: s.losses, picks: s.picks, bans, winRate: wr, pickRate: pr, banRate: br, score, forcedUp, penalized, distinctPlayers });
      });

      // 포지션별 상대 티어 배분
      const result: Record<Position, ChampTierStat[]> = {
        탑: [], 정글: [], 미드: [], 원딜: [], 서포터: [],
      };

      POSITIONS.forEach(pos => {
        const items = byPos[pos];
        const tiers = assignRelativeTiers(items, pos);
        items.forEach((c, i) => {
          const tier = tiers[i];
          result[pos].push({
            ...c,
            position: pos,
            totalGames: total,
            tier,
            isHoney: checkHoney(pos, c.champion, tier, c.winRate),
          });
        });
        result[pos].sort((a, b) => a.tier !== b.tier ? a.tier - b.tier : b.score - a.score);
      });

      setTierData(result);
      setLoading(false);
    });
  }, []);

  // 픽률 클릭 시 상세 플레이 소환사 계산
  const getPlayersWhoPlayed = (champName: string, pos: Position) => {
    const posIdx = POSITIONS.indexOf(pos);
    if (posIdx === -1) return [];

    const playerStatsMap = new Map<string, { wins: number; losses: number; kills: number; deaths: number; assists: number; hasKda: boolean }>();

    records.forEach(r => {
      const checkPlayer = (p: any, won: boolean) => {
        if (!p.champion || p.champion !== champName) return;

        let mainNickname = p.nickname;
        const norm = p.nickname.replace(/\s+/g, "").toLowerCase();
        const entry = nicknames.find(e =>
          e.nickname.replace(/\s+/g, "").toLowerCase() === norm ||
          e.altNicknames?.some((alt: string) => alt.replace(/\s+/g, "").toLowerCase() === norm)
        );

        if (entry) {
          mainNickname = entry.nickname;
        }

        const key = mainNickname;
        if (!playerStatsMap.has(key)) {
          playerStatsMap.set(key, { wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, hasKda: false });
        }
        const s = playerStatsMap.get(key)!;
        if (won) s.wins++; else s.losses++;

        if (p.kills !== undefined && p.deaths !== undefined && p.assists !== undefined) {
          s.kills += p.kills;
          s.deaths += p.deaths;
          s.assists += p.assists;
          s.hasKda = true;
        }
      };

      const p1 = r.team1[posIdx];
      if (p1) checkPlayer(p1, r.winTeam === 1);
      const p2 = r.team2[posIdx];
      if (p2) checkPlayer(p2, r.winTeam === 2);
    });

    const list: Array<{
      nickname: string;
      displayName: string;
      hasAlts: boolean;
      wins: number;
      losses: number;
      games: number;
      kills: number;
      deaths: number;
      assists: number;
      hasKda: boolean;
    }> = [];

    playerStatsMap.forEach((s, nick) => {
      const entry = nicknames.find(e => e.nickname === nick);
      const displayName = entry ? (entry.realName || entry.nickname) : nick;
      const hasAlts = !!(entry && entry.altNicknames && entry.altNicknames.length > 0);

      list.push({
        nickname: nick,
        displayName,
        hasAlts,
        wins: s.wins,
        losses: s.losses,
        games: s.wins + s.losses,
        kills: s.kills,
        deaths: s.deaths,
        assists: s.assists,
        hasKda: s.hasKda,
      });
    });

    return list.sort((a, b) => b.games !== a.games ? b.games - a.games : b.wins - a.wins);
  };

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const currentData = tierData[activePos];
  const tierGroups = ([1, 2, 3, 4, 5] as Tier[])
    .map(t => ({ tier: t, config: TIER_CONFIG[t], champs: currentData.filter(c => c.tier === t) }))
    .filter(g => g.champs.length > 0);
  const posColor = ROLE_COLORS[activePos];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <GuideBanner
        pageKey="champion"
        icon="⚔️"
        title="챔피언 분석 페이지 사용법"
        guideAnchor="champion"
        items={[
          "포지션별로 멤버들이 자주 플레이한 챔피언의 승률·픽률을 기반으로 티어가 자동 배정됩니다.",
          "상단 포지션 탭(탑·정글·미드·원딜·서포터)을 눌러 포지션별 통계를 확인하세요.",
          "플레이어 필터를 사용하면 특정 멤버의 챔피언 풀만 볼 수 있어요.",
          "기록이 쌓일수록 티어 정확도가 높아지니 꾸준히 캡쳐 분석으로 기록을 등록해주세요.",
        ]}
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--accent)" }}>🏆 챔피언 티어 리스트</h2>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            포지션 내 상대 순위 기반 자동 배분 — 1픽 이상 집계
            {totalGames > 0 && <span className="ml-2">({totalGames}경기 기준)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* 티어 빠른 이동 버튼 */}
          <div className="flex items-center gap-1 bg-[var(--panel-alt)] p-1 rounded-xl border" style={{ borderColor: "var(--border)" }}>
            {([1, 2, 3, 4, 5] as Tier[]).map(t => {
              const hasChamps = tierGroups.some(g => g.tier === t);
              const config = TIER_CONFIG[t];
              return (
                <button
                  key={t}
                  disabled={!hasChamps}
                  onClick={() => {
                    document.getElementById(`tier-section-${t}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="w-7 h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center"
                  style={{
                    background: hasChamps ? config.bg : "transparent",
                    color: hasChamps ? config.color : "var(--text-dim)",
                    opacity: hasChamps ? 1 : 0.35,
                    cursor: hasChamps ? "pointer" : "not-allowed",
                    border: hasChamps ? `1px solid ${config.color}33` : "1px solid transparent",
                  }}
                  title={hasChamps ? `${t}티어로 이동` : "해당 티어 챔피언 없음"}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5"
            style={{ background: "#50a05022", color: "#50a050", border: "1px solid #50a05044" }}>
            🍃 꿀챔피언
          </span>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        {POSITIONS.map(pos => (
          <button key={pos} onClick={() => handleSetPos(pos)}
            className="px-5 py-2.5 text-sm font-bold transition-all"
            style={{
              color: activePos === pos ? ROLE_COLORS[pos] : "var(--text-muted)",
              borderBottom: activePos === pos ? `2px solid ${ROLE_COLORS[pos]}` : "2px solid transparent",
            }}>
            {pos}
            {tierData[pos].length > 0 && (
              <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--text-dim)" }}>{tierData[pos].length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center" style={{ color: "var(--text-muted)" }}>
          <div className="text-3xl mb-4 animate-bounce">⏳</div>
          <p>챔피언 데이터를 분석 중입니다...</p>
        </div>
      ) : currentData.length === 0 ? (
        <div className="py-20 text-center rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
          <div className="text-4xl mb-3">📊</div>
          <p>{activePos} 포지션 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {tierGroups.map(({ tier, config, champs }) => (
            <div key={tier} id={`tier-section-${tier}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="px-4 py-1.5 rounded-lg font-black text-sm"
                  style={{ background: config.bg, color: config.color, border: `2px solid ${config.color}66` }}>
                  {config.label}
                </div>
                <div className="flex-1 h-px" style={{ background: `${config.color}33` }} />
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>{champs.length}개</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {champs.map(c => (
                  <div key={c.champion}
                    onClick={() => router.push(`/champion/${encodeURIComponent(c.champion)}?pos=${encodeURIComponent(activePos)}`)}
                    className="p-3 rounded-xl border transition-all hover:scale-[1.03] cursor-pointer hover:shadow-lg"
                    style={{
                      background: "var(--panel)",
                      borderColor: c.isHoney ? "#50a050" : `${config.color}44`,
                      borderLeft: `3px solid ${c.isHoney ? "#50a050" : config.color}`,
                    }}>
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <div className="flex items-center gap-1.5">
                        <ChampionPortrait name={c.champion} size={28} />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm leading-tight" style={{ color: posColor }}>{c.champion}</span>
                            {c.isHoney && <span title="꿀챔피언" style={{ fontSize: 12 }}>🍃</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        {c.forcedUp && <span title="밴율이 높고 승률도 좋은 픽이에요 — 그 친구의 시그니처여서든 챔피언 자체가 강해서든, &quot;상대하기 어려워서 배제한다&quot;는 점에서 우리 내전에선 동일하게 경계 대상으로 봅니다" className="px-1 rounded font-bold" style={{ background: "#fef2f2", color: "#ef4444", fontSize: 9 }}>경계대상</span>}
                        {c.penalized && <span className="px-1 rounded font-bold" style={{ background: "#f0f9ff", color: "#0284c7", fontSize: 9 }}>표본↓</span>}
                        {c.distinctPlayers === 1 && <span title="이 챔피언을 플레이한 사람이 1명뿐이라 개인 기량의 영향이 클 수 있어요" className="px-1 rounded font-bold" style={{ background: "#faf5ff", color: "#9333ea", fontSize: 9 }}>1인픽</span>}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span style={{ color: "var(--text-dim)" }}>승률</span>
                        <span className="font-bold" style={{ color: c.winRate >= 0.60 ? "var(--win)" : c.winRate >= 0.50 ? "var(--text)" : "var(--loss)" }}>
                          {pct(c.winRate)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center group/pick cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -mx-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChampForModal({ champion: c.champion, position: c.position });
                        }}
                        title="클릭 시 플레이 소환사 보기">
                        <span className="group-hover/pick:underline" style={{ color: "var(--text-dim)" }}>픽률</span>
                        <span className="font-bold group-hover/pick:text-[var(--accent)]" style={{ color: "var(--text-muted)" }}>{pct(c.pickRate)}</span>
                      </div>
                      <div className="flex justify-between" title="높을수록 &quot;상대하기 어려워서 미리 배제하는&quot; 픽이라는 뜻이에요">
                        <span style={{ color: "var(--text-dim)" }}>밴율</span>
                        <span style={{ color: c.banRate >= 0.25 ? "#ef4444" : "var(--text-muted)" }}>{pct(c.banRate)}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--hover)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.score)}%`, background: c.isHoney ? "#50a050" : config.color, opacity: 0.8 }} />
                      </div>
                      <div className="text-right mt-0.5" style={{ fontSize: 9, color: "var(--text-dim)" }}>점수 {c.score}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      )}

      {/* 플레이 소환사 현황 모달 */}
      {selectedChampForModal && (() => {
        const players = getPlayersWhoPlayed(selectedChampForModal.champion, selectedChampForModal.position);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedChampForModal(null)}>
            <div className="rounded-2xl border p-6 max-w-lg w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
              onClick={e => e.stopPropagation()}>
              
              <button className="absolute top-4 right-4 text-2xl hover:opacity-75 focus:outline-none"
                style={{ color: "var(--text-dim)" }}
                onClick={() => setSelectedChampForModal(null)}>
                ×
              </button>

              <div className="flex items-center gap-3 mb-4">
                <ChampionPortrait name={selectedChampForModal.champion} size={40} />
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                    {selectedChampForModal.champion} 플레이어 현황
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    포지션: <span className="font-bold" style={{ color: ROLE_COLORS[selectedChampForModal.position] }}>{selectedChampForModal.position}</span>
                  </p>
                </div>
              </div>

              <div className="overflow-auto max-h-[350px] pr-1">
                {players.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: "var(--text-dim)" }}>플레이 기록이 없습니다.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                        <th className="py-2 text-left text-xs" style={{ color: "var(--text-muted)" }}>소환사</th>
                        <th className="py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>판수</th>
                        <th className="py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>승률</th>
                        <th className="py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>평균 KDA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map(p => {
                        const wr = p.wins / p.games;
                        const avgK = p.hasKda ? (p.kills / p.games).toFixed(1) : "-";
                        const avgD = p.hasKda ? (p.deaths / p.games).toFixed(1) : "-";
                        const avgA = p.hasKda ? (p.assists / p.games).toFixed(1) : "-";
                        const ratio = p.hasKda && p.deaths > 0 ? ((p.kills + p.assists) / p.deaths).toFixed(2) : p.hasKda ? "Perfect" : "-";

                        return (
                          <tr key={p.nickname} className="border-b hover:bg-[var(--hover)] transition-colors cursor-pointer"
                            style={{ borderColor: "var(--border)" }}
                            onClick={() => {
                              setSelectedChampForModal(null);
                              if (p.hasAlts) router.push(`/ranking/person/${encodeURIComponent(p.nickname)}`);
                              else router.push(`/ranking/${encodeURIComponent(p.nickname)}`);
                            }}>
                            <td className="py-3 font-semibold" style={{ color: "var(--accent)" }}>
                              {p.displayName}
                            </td>
                            <td className="py-3 text-center" style={{ color: "var(--text)" }}>
                              {p.games}판
                            </td>
                            <td className="py-3 text-center font-bold"
                              style={{ color: wr >= 0.60 ? "var(--win)" : wr >= 0.50 ? "var(--text)" : "var(--loss)" }}>
                              {Math.round(wr * 100)}%
                              <div className="text-[10px] font-normal" style={{ color: "var(--text-dim)" }}>{p.wins}승 {p.losses}패</div>
                            </td>
                            <td className="py-3 text-center text-xs">
                              {p.hasKda ? (
                                <div>
                                  <div className="font-bold" style={{ color: ratio === "Perfect" || parseFloat(ratio) >= 4 ? "var(--win)" : parseFloat(ratio) >= 2 ? "var(--text)" : "var(--loss)" }}>
                                    {ratio === "Perfect" ? "Perfect" : `${ratio}:1`}
                                  </div>
                                  <div style={{ color: "var(--text-dim)", fontSize: 10 }}>{avgK}/{avgD}/{avgA}</div>
                                </div>
                              ) : (
                                <span style={{ color: "var(--text-dim)" }}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
