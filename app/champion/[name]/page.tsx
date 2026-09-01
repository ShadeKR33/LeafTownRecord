"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { loadGameRecords, loadNicknames } from "@/lib/stats";
import type { GameRecord } from "@/lib/types";
import { POSITIONS, computeScore, assignRelativeTiers, computeRelativeWR } from "../page";
import type { Position, Tier } from "../page";
import { ChampionPortrait } from "@/components/ChampionPortrait";
import { normalizeChampionName } from "@/lib/champions";

const ROLE_COLORS: Record<Position, string> = {
  탑: "#e06060", 정글: "#50a050", 미드: "#5090d0", 원딜: "#c0a030", 서포터: "#9060c0",
};
const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  1: { label: "1티어", color: "#ef4444", bg: "#fef2f2" },
  2: { label: "2티어", color: "#f97316", bg: "#fff7ed" },
  3: { label: "3티어", color: "#eab308", bg: "#fefce8" },
  4: { label: "4티어", color: "#6366f1", bg: "#eef2ff" },
  5: { label: "5티어", color: "#94a3b8", bg: "#f8fafc" },
};
const DUO_PARTNERS: Record<Position, { label: string; partnerPos: Position }[]> = {
  탑:     [{ label: "함께한 정글", partnerPos: "정글" }],
  정글:   [{ label: "함께한 미드",   partnerPos: "미드" }, { label: "함께한 서포터", partnerPos: "서포터" }],
  미드:   [{ label: "함께한 정글", partnerPos: "정글" }],
  원딜:   [{ label: "함께한 서포터", partnerPos: "서포터" }],
  서포터: [{ label: "함께한 원딜",   partnerPos: "원딜" }, { label: "함께한 정글", partnerPos: "정글" }],
};

interface PosStats {
  pos: Position;
  wins: number; losses: number; picks: number;
  bans: number; totalGames: number;
  winRate: number; pickRate: number; banRate: number;
  score: number; tier: Tier;
  forcedUp: boolean; penalized: boolean; isHoney: boolean;
}

interface DuoEntry {
  partner: string; wins: number; losses: number; games: number; winRate: number;
}

export default function ChampionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ pos?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const champion = normalizeChampionName(decodeURIComponent(resolvedParams.name));
  const initialPos = resolvedSearchParams.pos as Position | null;
  const router = useRouter();

  const [posStats, setPosStats] = useState<PosStats[]>([]);
  const [duoData, setDuoData] = useState<Record<Position, Record<string, DuoEntry[]>>>({
    탑: {}, 정글: {}, 미드: {}, 원딜: {}, 서포터: {},
  });
  const [counterData, setCounterData] = useState<Record<Position, { hard: DuoEntry[]; easy: DuoEntry[] }>>({
    탑: { hard: [], easy: [] }, 정글: { hard: [], easy: [] }, 미드: { hard: [], easy: [] },
    원딜: { hard: [], easy: [] }, 서포터: { hard: [], easy: [] },
  });
  const [activePos, setActivePos] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalGames, setTotalGames] = useState(0);

  // 모달 및 데이터 관리용 추가 상태
  const [nicknames, setNicknames] = useState<any[]>([]);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDuoForModal, setSelectedDuoForModal] = useState<{ partnerChamp: string; partnerPos: Position } | null>(null);
  const [selectedCounterForModal, setSelectedCounterForModal] = useState<{ enemyChamp: string; type: "easy" | "hard" } | null>(null);

  const resolveMainNickname = (nick: string): string => {
    const norm = nick.replace(/\s+/g, "").toLowerCase();
    const entry = nicknames.find(e =>
      e.nickname.replace(/\s+/g, "").toLowerCase() === norm ||
      e.altNicknames?.some((alt: string) => alt.replace(/\s+/g, "").toLowerCase() === norm)
    );
    return entry ? entry.nickname : nick;
  };

  useEffect(() => {
    Promise.all([loadGameRecords(), loadNicknames()]).then(([records, nicknames]) => {
      setRecords(records);
      setNicknames(nicknames);
      if (records.length === 0) { setLoading(false); return; }
      const total = records.length;
      setTotalGames(total);

      const POS_IDX = Object.fromEntries(POSITIONS.map((p, i) => [p, i])) as Record<Position, number>;

      // 전체 챔피언×포지션 통계 (상대 티어 계산용)
      const allPosMap = new Map<string, { wins: number; losses: number; picks: number }>();
      // 플레이어별 (꿀챔 판별, 이 챔피언만)
      const playerMap = new Map<string, { wins: number; losses: number }>();
      // 플레이어×포지션×챔피언 (전체 — 상대 승률 보정용)
      const playerChampMap = new Map<string, { wins: number; losses: number }>();
      // 플레이어 전체 승률 (상대 승률 보정의 기준선)
      const playerOverallMap = new Map<string, { wins: number; losses: number }>();
      // 듀오 시너지
      const duoMap = new Map<string, { wins: number; losses: number }>();

      records.forEach(r => {
        const process = (team: GameRecord["team1"], won: boolean) => {
          team.forEach((p, myIdx) => {
            if (!p.champion || p.champion === "?") return;
            const myPos = POSITIONS[myIdx]; if (!myPos) return;
            const myChamp = normalizeChampionName(p.champion);
            const gk = `${myPos}|||${myChamp}`;
            if (!allPosMap.has(gk)) allPosMap.set(gk, { wins: 0, losses: 0, picks: 0 });
            const gs = allPosMap.get(gk)!;
            gs.picks++; if (won) gs.wins++; else gs.losses++;

            // 상대 승률 보정용 (모든 챔피언 대상)
            const pck = `${p.nickname}|||${myPos}|||${myChamp}`;
            if (!playerChampMap.has(pck)) playerChampMap.set(pck, { wins: 0, losses: 0 });
            const pcs = playerChampMap.get(pck)!;
            if (won) pcs.wins++; else pcs.losses++;
            if (!playerOverallMap.has(p.nickname)) playerOverallMap.set(p.nickname, { wins: 0, losses: 0 });
            const pos2 = playerOverallMap.get(p.nickname)!;
            if (won) pos2.wins++; else pos2.losses++;

            // 플레이어별 (이 챔피언만)
            if (myChamp === champion) {
              const pk = `${p.nickname}|||${myPos}`;
              if (!playerMap.has(pk)) playerMap.set(pk, { wins: 0, losses: 0 });
              const ps = playerMap.get(pk)!;
              if (won) ps.wins++; else ps.losses++;

              // 듀오
              DUO_PARTNERS[myPos]?.forEach(({ partnerPos }) => {
                const partnerIdx = POS_IDX[partnerPos];
                const partner = team[partnerIdx];
                if (!partner?.champion || partner.champion === "?") return;
                const dk = `${myPos}|||${partnerPos}|||${normalizeChampionName(partner.champion)}`;
                if (!duoMap.has(dk)) duoMap.set(dk, { wins: 0, losses: 0 });
                const ds = duoMap.get(dk)!;
                if (won) ds.wins++; else ds.losses++;
              });

              // 상대 챔피언 (같은 포지션 적팀)
              const enemyTeam = team === r.team1 ? r.team2 : r.team1;
              const enemy = enemyTeam[myIdx];
              if (enemy?.champion && enemy.champion !== "?") {
                const ck = `${myPos}|||enemy|||${normalizeChampionName(enemy.champion)}`;
                if (!duoMap.has(ck)) duoMap.set(ck, { wins: 0, losses: 0 });
                const cs = duoMap.get(ck)!;
                if (won) cs.wins++; else cs.losses++;
              }
            }
          });
        };
        process(r.team1, r.winTeam === 1);
        process(r.team2, r.winTeam === 2);
      });

      // 밴 수
      const banCount = records.reduce((cnt, r) => {
        if (!r.bans) return cnt;
        return cnt + [...(r.bans.team1 || []), ...(r.bans.team2 || [])].filter(c => normalizeChampionName(c) === champion).length;
      }, 0);
      const br = banCount / total;

      // 꿀챔 체크
      const checkHoney = (pos: Position, wr: number, tier: Tier): boolean => {
        if (tier !== 1 || wr < 0.52) return false;
        const suffix = `|||${pos}`;
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

      // 포지션별 이 챔피언 통계 + 상대 티어 계산
      const stats: PosStats[] = [];
      POSITIONS.forEach(pos => {
        const myKey = `${pos}|||${champion}`;
        const myS = allPosMap.get(myKey);
        if (!myS || myS.picks < 1) return;

        // 같은 포지션의 모든 챔피언 수집 (상대 티어용)
        const posItems: Array<{ champion: string; score: number; forcedUp: boolean; penalized: boolean }> = [];
        allPosMap.forEach((s, key) => {
          if (!key.startsWith(`${pos}|||`) || s.picks < 1) return;
          const chmp = key.slice(pos.length + 3);
          const wr2 = s.wins / s.picks;
          const pr2 = s.picks / total;
          const bans2 = records.reduce((cnt, r) => {
            if (!r.bans) return cnt;
            return cnt + [...(r.bans.team1 || []), ...(r.bans.team2 || [])].filter(c => normalizeChampionName(c) === chmp).length;
          }, 0);
          const br2 = bans2 / total;
          // 챔피언 분석 페이지와 동일한 기준(개인별 평소 승률 대비 보정)으로 티어를 계산해야 일관됨
          const { adjWR: adjWR2 } = computeRelativeWR(playerChampMap, playerOverallMap, pos, chmp, wr2);
          posItems.push({
            champion: chmp,
            score: computeScore(adjWR2, pr2, br2),
            forcedUp: br2 > 0.25 && adjWR2 > 0.50,
            penalized: pr2 < 0.10 && adjWR2 > 0.60,
          });
        });

        const tierList = assignRelativeTiers(posItems, pos);
        const myIdx = posItems.findIndex(it => it.champion === champion);
        const tier = myIdx >= 0 ? tierList[myIdx] : 3;

        const wr = myS.wins / myS.picks;
        const pr = myS.picks / total;
        // 챔피언 분석 페이지의 점수/태그와 일치하도록 posItems에서 동일 계산 결과를 그대로 사용
        const myItem = myIdx >= 0 ? posItems[myIdx] : null;
        const score = myItem ? myItem.score : computeScore(wr, pr, br);

        stats.push({
          pos, wins: myS.wins, losses: myS.losses, picks: myS.picks,
          bans: banCount, totalGames: total, winRate: wr, pickRate: pr, banRate: br,
          score, tier,
          forcedUp: myItem ? myItem.forcedUp : (br > 0.25 && wr > 0.50),
          penalized: myItem ? myItem.penalized : (pr < 0.10 && wr > 0.60),
          isHoney: checkHoney(pos, wr, tier),
        });
      });
      stats.sort((a, b) => b.picks - a.picks);

      // 듀오 & 카운터 데이터 구성
      const duo: Record<Position, Record<string, DuoEntry[]>> = {
        탑: {}, 정글: {}, 미드: {}, 원딜: {}, 서포터: {},
      };
      const counter: Record<Position, { hard: DuoEntry[]; easy: DuoEntry[] }> = {
        탑: { hard: [], easy: [] }, 정글: { hard: [], easy: [] }, 미드: { hard: [], easy: [] },
        원딜: { hard: [], easy: [] }, 서포터: { hard: [], easy: [] },
      };

      duoMap.forEach((s, key) => {
        const parts = key.split("|||");
        const [myPos, partnerPos, partnerChamp] = parts;
        const games = s.wins + s.losses;
        if (games < 1) return;
        const entry: DuoEntry = { partner: partnerChamp, wins: s.wins, losses: s.losses, games, winRate: s.wins / games };

        if (partnerPos === "enemy") {
          // 상대 챔피언 데이터
          counter[myPos as Position].hard.push(entry); // 내 승률 기준 — 낮을수록 상대하기 어려움
          counter[myPos as Position].easy.push(entry);
        } else {
          if (!duo[myPos as Position][partnerPos]) duo[myPos as Position][partnerPos] = [];
          duo[myPos as Position][partnerPos].push(entry);
        }
      });

      // 정렬
      POSITIONS.forEach(pos => {
        Object.keys(duo[pos]).forEach(pp => {
          duo[pos][pp].sort((a, b) => (b.winRate * Math.min(b.games, 5)) - (a.winRate * Math.min(a.games, 5)));
        });
        // 상대하기 어려운: 내 승률 < 0.5인 챔피언만 (낮은 순)
        counter[pos].hard = counter[pos].hard
          .filter(e => e.winRate < 0.5)
          .sort((a, b) => a.winRate - b.winRate)
          .slice(0, 5);
        // 상대하기 쉬운: 내 승률 > 0.5인 챔피언만 (높은 순, hard와 겹치지 않음)
        counter[pos].easy = counter[pos].easy
          .filter(e => e.winRate > 0.5)
          .sort((a, b) => b.winRate - a.winRate)
          .slice(0, 5);
      });

      setPosStats(stats);
      setDuoData(duo);
      setCounterData(counter);
      
      const targetPos = initialPos && stats.some(s => s.pos === initialPos)
        ? initialPos
        : (stats[0]?.pos ?? null);
      setActivePos(targetPos);
      
      setLoading(false);
    });
  }, [champion, initialPos]);

  // 픽률 클릭 시 상세 플레이 소환사 계산
  const getPlayersWhoPlayed = (champName: string, pos: Position) => {
    const posIdx = POSITIONS.indexOf(pos);
    if (posIdx === -1) return [];

    const playerStatsMap = new Map<string, { wins: number; losses: number; kills: number; deaths: number; assists: number; hasKda: boolean }>();

    records.forEach(r => {
      const checkPlayer = (p: any, won: boolean) => {
        if (!p.champion || normalizeChampionName(p.champion) !== champName) return;

        const mainNickname = resolveMainNickname(p.nickname);
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

  const getDuoPlayerBreakdown = (partnerChamp: string, partnerPos: Position) => {
    if (!activePos) return [];
    const myPosIdx = POSITIONS.indexOf(activePos);
    const partnerPosIdx = POSITIONS.indexOf(partnerPos);
    if (myPosIdx === -1 || partnerPosIdx === -1) return [];

    const pairsMap = new Map<string, { wins: number; losses: number }>();

    records.forEach(r => {
      const checkTeam = (team: any[], won: boolean) => {
        const myPlayer = team[myPosIdx];
        const partnerPlayer = team[partnerPosIdx];

        if (
          myPlayer && myPlayer.champion && normalizeChampionName(myPlayer.champion) === champion &&
          partnerPlayer && partnerPlayer.champion && normalizeChampionName(partnerPlayer.champion) === partnerChamp
        ) {
          const myName = resolveMainNickname(myPlayer.nickname);
          const partnerName = resolveMainNickname(partnerPlayer.nickname);
          const key = `${myName}|||${partnerName}`;

          if (!pairsMap.has(key)) {
            pairsMap.set(key, { wins: 0, losses: 0 });
          }
          const s = pairsMap.get(key)!;
          if (won) s.wins++; else s.losses++;
        }
      };

      checkTeam(r.team1, r.winTeam === 1);
      checkTeam(r.team2, r.winTeam === 2);
    });

    const list: Array<{
      myNickname: string;
      myDisplayName: string;
      partnerNickname: string;
      partnerDisplayName: string;
      wins: number;
      losses: number;
      games: number;
    }> = [];

    pairsMap.forEach((s, key) => {
      const [myNick, partnerNick] = key.split("|||");
      const myEntry = nicknames.find(e => e.nickname === myNick);
      const myDisplayName = myEntry ? (myEntry.realName || myNick) : myNick;
      const partnerEntry = nicknames.find(e => e.nickname === partnerNick);
      const partnerDisplayName = partnerEntry ? (partnerEntry.realName || partnerNick) : partnerNick;

      list.push({
        myNickname: myNick,
        myDisplayName,
        partnerNickname: partnerNick,
        partnerDisplayName,
        wins: s.wins,
        losses: s.losses,
        games: s.wins + s.losses,
      });
    });

    return list.sort((a, b) => b.games - a.games || b.wins - a.wins);
  };

  const getCounterPlayerBreakdown = (enemyChamp: string) => {
    if (!activePos) return [];
    const posIdx = POSITIONS.indexOf(activePos);
    if (posIdx === -1) return [];

    const pairsMap = new Map<string, { wins: number; losses: number }>();

    records.forEach(r => {
      const p1 = r.team1[posIdx];
      const p2 = r.team2[posIdx];

      if (p1 && p2 && p1.champion && p2.champion) {
        const c1 = normalizeChampionName(p1.champion);
        const c2 = normalizeChampionName(p2.champion);
        if (c1 === champion && c2 === enemyChamp) {
          const myName = resolveMainNickname(p1.nickname);
          const enemyName = resolveMainNickname(p2.nickname);
          const key = `${myName}|||${enemyName}`;
          if (!pairsMap.has(key)) pairsMap.set(key, { wins: 0, losses: 0 });
          const s = pairsMap.get(key)!;
          if (r.winTeam === 1) s.wins++; else s.losses++;
        }
        else if (c2 === champion && c1 === enemyChamp) {
          const myName = resolveMainNickname(p2.nickname);
          const enemyName = resolveMainNickname(p1.nickname);
          const key = `${myName}|||${enemyName}`;
          if (!pairsMap.has(key)) pairsMap.set(key, { wins: 0, losses: 0 });
          const s = pairsMap.get(key)!;
          if (r.winTeam === 2) s.wins++; else s.losses++;
        }
      }
    });

    const list: Array<{
      myNickname: string;
      myDisplayName: string;
      enemyNickname: string;
      enemyDisplayName: string;
      wins: number;
      losses: number;
      games: number;
    }> = [];

    pairsMap.forEach((s, key) => {
      const [myNick, enemyNick] = key.split("|||");
      const myEntry = nicknames.find(e => e.nickname === myNick);
      const myDisplayName = myEntry ? (myEntry.realName || myNick) : myNick;
      const enemyEntry = nicknames.find(e => e.nickname === enemyNick);
      const enemyDisplayName = enemyEntry ? (enemyEntry.realName || enemyNick) : enemyNick;

      list.push({
        myNickname: myNick,
        myDisplayName,
        enemyNickname: enemyNick,
        enemyDisplayName,
        wins: s.wins,
        losses: s.losses,
        games: s.wins + s.losses,
      });
    });

    return list.sort((a, b) => b.games - a.games || b.wins - a.wins);
  };

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const curStat = posStats.find(s => s.pos === activePos);
  const curDuo = activePos ? duoData[activePos] : {};
  const curCounter = activePos ? counterData[activePos] : { hard: [], easy: [] };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="px-3 py-1.5 rounded text-sm"
          style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>←</button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text)" }}>
            <ChampionPortrait name={champion} size={44} />
            {champion}
            {curStat?.isHoney && <span title="꿀챔피언">🍃</span>}
          </h2>
          {totalGames > 0 && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {totalGames}경기 기준 · 밴 {posStats[0]?.bans ?? 0}회 ({pct(posStats[0]?.banRate ?? 0)})
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center" style={{ color: "var(--text-muted)" }}>
          <div className="text-3xl mb-4 animate-bounce">⏳</div>데이터 분석 중...
        </div>
      ) : posStats.length === 0 ? (
        <div className="py-16 text-center rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text-muted)" }}>기록이 없습니다.</div>
      ) : (
        <>
          {/* 포지션별 픽 분포 */}
          <div className="p-4 rounded-lg border mb-5" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
            <div className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>📍 포지션별 픽 분포</div>
            <div className="flex gap-2 flex-wrap">
              {posStats.map(s => {
                const tc = TIER_CONFIG[s.tier];
                return (
                  <div key={s.pos} onClick={() => setActivePos(s.pos)}
                    className="flex-1 min-w-[80px] p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.03]"
                    style={{
                      background: activePos === s.pos ? ROLE_COLORS[s.pos] + "22" : "var(--panel-alt)",
                      border: `2px solid ${activePos === s.pos ? ROLE_COLORS[s.pos] : "var(--border)"}`,
                    }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm" style={{ color: ROLE_COLORS[s.pos] }}>{s.pos}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.picks}픽 · {pct(s.pickRate)}</div>
                    <div className="h-1 mt-1.5 rounded-full overflow-hidden" style={{ background: "var(--hover)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.picks / (totalGames || 1) * 100 * 3)}%`, background: ROLE_COLORS[s.pos] }} />
                    </div>
                    {s.isHoney && <div className="text-xs mt-1" style={{ color: "#50a050" }}>🍃 꿀챔</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 포지션 탭 */}
          <div className="flex gap-1 mb-5 border-b" style={{ borderColor: "var(--border)" }}>
            {posStats.map(s => (
              <button key={s.pos} onClick={() => setActivePos(s.pos)}
                className="px-4 py-2 text-sm font-bold transition-all"
                style={{
                  color: activePos === s.pos ? ROLE_COLORS[s.pos] : "var(--text-muted)",
                  borderBottom: activePos === s.pos ? `2px solid ${ROLE_COLORS[s.pos]}` : "2px solid transparent",
                }}>
                {s.pos}
              </button>
            ))}
          </div>

          {curStat && (
            <div className="space-y-5">
              {/* 티어 + 통계 카드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border text-center col-span-2 md:col-span-1"
                  style={{ background: TIER_CONFIG[curStat.tier].bg, borderColor: `${TIER_CONFIG[curStat.tier].color}66` }}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>티어</div>
                  <div className="text-3xl font-black" style={{ color: TIER_CONFIG[curStat.tier].color }}>{TIER_CONFIG[curStat.tier].label}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>점수 {curStat.score}</div>
                  {curStat.isHoney && <div className="mt-1 text-sm" style={{ color: "#50a050" }}>🍃 꿀챔피언</div>}
                  {curStat.forcedUp && <div title="밴율이 높고 승률도 좋은 픽이에요 — 그 친구의 시그니처여서든 챔피언 자체가 강해서든, &quot;상대하기 어려워서 배제한다&quot;는 점에서 우리 내전에선 동일하게 경계 대상으로 봅니다" className="mt-1 text-xs px-2 py-0.5 rounded inline-block" style={{ background: "#fef2f2", color: "#ef4444" }}>높은 위협도(밴율)로 강제 1티어</div>}
                </div>
                <div className="p-4 rounded-xl border text-center" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>승률</div>
                  <div className="text-2xl font-bold" style={{ color: curStat.winRate >= 0.60 ? "var(--win)" : curStat.winRate >= 0.50 ? "var(--text)" : "var(--loss)" }}>
                    {pct(curStat.winRate)}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{curStat.wins}승 {curStat.losses}패</div>
                </div>
                <div className="p-4 rounded-xl border text-center cursor-pointer hover:bg-[var(--hover)] hover:scale-[1.02] transition-all duration-150"
                  style={{ background: "var(--panel)", borderColor: "var(--border)" }}
                  onClick={() => setShowModal(true)}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>픽률</div>
                  <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{pct(curStat.pickRate)}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{curStat.picks}픽 / {totalGames}경기</div>
                </div>
                <div className="p-4 rounded-xl border text-center" title="높을수록 &quot;상대하기 어려워서 미리 배제하는&quot; 픽이라는 뜻이에요" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
                  <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>밴율</div>
                  <div className="text-2xl font-bold" style={{ color: curStat.banRate >= 0.25 ? "#ef4444" : "var(--text)" }}>
                    {pct(curStat.banRate)}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{curStat.bans}밴 / {totalGames}경기</div>
                </div>
              </div>

              {/* 듀오 시너지 */}
              {activePos && DUO_PARTNERS[activePos].length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>⚡ 듀오 시너지</span>
                    <span className="text-xs" style={{ color: "var(--text-dim)" }}>1경기 이상 · 🔸 단일 경기 (신뢰도 낮음)</span>
                  </div>
                  <div className={`grid gap-4 ${DUO_PARTNERS[activePos].length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
                    {DUO_PARTNERS[activePos].map(({ label, partnerPos }) => {
                      const entries = (curDuo[partnerPos] || []).slice(0, 5);
                      const pc = ROLE_COLORS[partnerPos];
                      return (
                        <div key={partnerPos} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                          <div className="px-4 py-2.5 text-xs font-bold"
                            style={{ background: pc + "22", color: pc, borderBottom: `1px solid ${pc}44` }}>
                            {label} ({partnerPos})
                          </div>
                          {entries.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>데이터 없음</div>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr style={{ background: "var(--panel)" }}>
                                  <th className="px-4 py-2 text-left text-xs" style={{ color: "var(--text-muted)" }}>챔피언</th>
                                  <th className="px-4 py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>승/패</th>
                                  <th className="px-4 py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>승률</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entries.map((e, i) => (
                                  <tr key={e.partner}
                                    onClick={() => setSelectedDuoForModal({ partnerChamp: e.partner, partnerPos })}
                                    className="hover:bg-[var(--hover)] transition-colors cursor-pointer"
                                    style={{ background: i % 2 === 0 ? "var(--panel-alt)" : "var(--panel)", borderTop: "1px solid var(--border)" }}>
                                    <td className="px-4 py-2.5 font-semibold" style={{ color: pc }}>
                                      {i === 0 && "🥇 "}{i === 1 && "🥈 "}{i === 2 && "🥉 "}
                                      {e.partner}
                                      {e.games === 1 && <span className="ml-1" style={{ color: "#f59e0b", fontSize: 11 }}>🔸</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                                      <span style={{ color: "var(--win)" }}>{e.wins}W</span> / <span style={{ color: "var(--loss)" }}>{e.losses}L</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-bold"
                                      style={{ color: e.winRate >= 0.60 ? "var(--win)" : e.winRate >= 0.50 ? "var(--text)" : "var(--loss)" }}>
                                      {pct(e.winRate)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* 상대 챔피언 */}
              {(curCounter.hard.length > 0 || curCounter.easy.length > 0) && (
                <div>
                  <div className="text-sm font-bold mb-3" style={{ color: "var(--accent)" }}>⚔️ 상대 챔피언 (같은 포지션)</div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 상대하기 어려운 */}
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                      <div className="px-4 py-2.5 text-xs font-bold" style={{ background: "#fef2f222", color: "#ef4444", borderBottom: "1px solid #ef444433" }}>
                        😰 상대하기 어려운 챔피언 (내 승률 낮음)
                      </div>
                      {curCounter.hard.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>데이터 없음</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead><tr style={{ background: "var(--panel)" }}>
                            {["챔피언","대결","내 승률"].map(h => <th key={h} className="px-3 py-2 text-xs text-center" style={{ color: "var(--text-muted)" }}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {curCounter.hard.map((e, i) => (
                              <tr key={e.partner}
                                onClick={() => setSelectedCounterForModal({ enemyChamp: e.partner, type: "hard" })}
                                className="hover:bg-[var(--hover)] transition-colors cursor-pointer"
                                style={{ background: i%2===0?"var(--panel-alt)":"var(--panel)", borderTop:"1px solid var(--border)" }}>
                                <td className="px-3 py-2 font-semibold text-center" style={{ color: "#ef4444" }}>{e.partner}</td>
                                <td className="px-3 py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>{e.games}전</td>
                                <td className="px-3 py-2 text-center font-bold" style={{ color: e.winRate >= 0.5 ? "var(--win)" : "var(--loss)" }}>{pct(e.winRate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    {/* 상대하기 쉬운 */}
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                      <div className="px-4 py-2.5 text-xs font-bold" style={{ background: "#f0fdf422", color: "#4ade80", borderBottom: "1px solid #4ade8033" }}>
                        😎 상대하기 쉬운 챔피언 (내 승률 높음)
                      </div>
                      {curCounter.easy.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>데이터 없음</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead><tr style={{ background: "var(--panel)" }}>
                            {["챔피언","대결","내 승률"].map(h => <th key={h} className="px-3 py-2 text-xs text-center" style={{ color: "var(--text-muted)" }}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {curCounter.easy.map((e, i) => (
                              <tr key={e.partner}
                                onClick={() => setSelectedCounterForModal({ enemyChamp: e.partner, type: "easy" })}
                                className="hover:bg-[var(--hover)] transition-colors cursor-pointer"
                                style={{ background: i%2===0?"var(--panel-alt)":"var(--panel)", borderTop:"1px solid var(--border)" }}>
                                <td className="px-3 py-2 font-semibold text-center" style={{ color: "#4ade80" }}>{e.partner}</td>
                                <td className="px-3 py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>{e.games}전</td>
                                <td className="px-3 py-2 text-center font-bold" style={{ color: e.winRate >= 0.5 ? "var(--win)" : "var(--loss)" }}>{pct(e.winRate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 플레이 소환사 현황 모달 */}
      {showModal && activePos && (() => {
        const players = getPlayersWhoPlayed(champion, activePos);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}>
            <div className="rounded-2xl border p-6 max-w-lg w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
              onClick={e => e.stopPropagation()}>
              
              <button className="absolute top-4 right-4 text-2xl hover:opacity-75 focus:outline-none"
                style={{ color: "var(--text-dim)" }}
                onClick={() => setShowModal(false)}>
                ×
              </button>

              <div className="flex items-center gap-3 mb-4">
                <ChampionPortrait name={champion} size={44} />
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                    {champion} 플레이어 현황
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    포지션: <span className="font-bold" style={{ color: ROLE_COLORS[activePos] }}>{activePos}</span>
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
                              setShowModal(false);
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
                                  <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                                    {avgK} / {avgD} / {avgA}
                                  </div>
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

      {/* 듀오 플레이어 매칭 상세 모달 */}
      {selectedDuoForModal && activePos && (() => {
        const list = getDuoPlayerBreakdown(selectedDuoForModal.partnerChamp, selectedDuoForModal.partnerPos);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDuoForModal(null)}>
            <div className="rounded-2xl border p-6 max-w-lg w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
              onClick={e => e.stopPropagation()}>
              
              <button className="absolute top-4 right-4 text-2xl hover:opacity-75 focus:outline-none"
                style={{ color: "var(--text-dim)" }}
                onClick={() => setSelectedDuoForModal(null)}>
                ×
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center">
                  <ChampionPortrait name={champion} size={32} />
                  <span className="text-sm mx-1.5" style={{ color: "var(--text-muted)" }}>+</span>
                  <ChampionPortrait name={selectedDuoForModal.partnerChamp} size={32} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold truncate" style={{ color: "var(--text)" }}>
                    듀오 조합 플레이어 상세
                  </h3>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    조합: {champion}(<span className="font-bold" style={{ color: ROLE_COLORS[activePos] }}>{activePos}</span>) + {selectedDuoForModal.partnerChamp}(<span className="font-bold" style={{ color: ROLE_COLORS[selectedDuoForModal.partnerPos] }}>{selectedDuoForModal.partnerPos}</span>)
                  </p>
                </div>
              </div>

              <div className="overflow-auto max-h-[350px] pr-1">
                {list.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: "var(--text-dim)" }}>합을 맞춘 기록이 없습니다.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                        <th className="py-2 text-left text-xs" style={{ color: "var(--text-muted)" }}>아군 ({champion})</th>
                        <th className="py-2 text-left text-xs" style={{ color: "var(--text-muted)" }}>파트너 ({selectedDuoForModal.partnerChamp})</th>
                        <th className="py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>전적</th>
                        <th className="py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>승률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((item, idx) => {
                        const wr = item.wins / item.games;
                        return (
                          <tr key={idx} className="border-b hover:bg-[var(--hover)] transition-colors"
                            style={{ borderColor: "var(--border)" }}>
                            <td className="py-3 font-semibold" style={{ color: "var(--text)" }}>
                              {item.myDisplayName}
                            </td>
                            <td className="py-3 font-semibold" style={{ color: ROLE_COLORS[selectedDuoForModal.partnerPos] }}>
                              {item.partnerDisplayName}
                            </td>
                            <td className="py-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                              {item.games}판 ({item.wins}승 {item.losses}패)
                            </td>
                            <td className="py-3 text-center font-bold"
                              style={{ color: wr >= 0.60 ? "var(--win)" : wr >= 0.50 ? "var(--text)" : "var(--loss)" }}>
                              {Math.round(wr * 100)}%
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

      {/* 카운터 플레이어 매칭 상세 모달 */}
      {selectedCounterForModal && activePos && (() => {
        const list = getCounterPlayerBreakdown(selectedCounterForModal.enemyChamp);
        const isEasy = selectedCounterForModal.type === "easy";
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCounterForModal(null)}>
            <div className="rounded-2xl border p-6 max-w-lg w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
              onClick={e => e.stopPropagation()}>
              
              <button className="absolute top-4 right-4 text-2xl hover:opacity-75 focus:outline-none"
                style={{ color: "var(--text-dim)" }}
                onClick={() => setSelectedCounterForModal(null)}>
                ×
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center">
                  <ChampionPortrait name={champion} size={32} />
                  <span className="text-sm mx-1.5" style={{ color: "var(--text-muted)" }}>vs</span>
                  <ChampionPortrait name={selectedCounterForModal.enemyChamp} size={32} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold truncate" style={{ color: "var(--text)" }}>
                    상대 매치업 플레이어 상세
                  </h3>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    포지션: <span className="font-bold" style={{ color: ROLE_COLORS[activePos] }}>{activePos}</span> ({isEasy ? "상대하기 쉬운 매치" : "상대하기 어려운 매치"})
                  </p>
                </div>
              </div>

              <div className="overflow-auto max-h-[350px] pr-1">
                {list.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: "var(--text-dim)" }}>대결한 기록이 없습니다.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                        <th className="py-2 text-left text-xs" style={{ color: "var(--text-muted)" }}>아군 ({champion})</th>
                        <th className="py-2 text-left text-xs" style={{ color: "var(--text-muted)" }}>적군 ({selectedCounterForModal.enemyChamp})</th>
                        <th className="py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>전적 (아군 승/패)</th>
                        <th className="py-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>아군 승률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((item, idx) => {
                        const wr = item.wins / item.games;
                        return (
                          <tr key={idx} className="border-b hover:bg-[var(--hover)] transition-colors"
                            style={{ borderColor: "var(--border)" }}>
                            <td className="py-3 font-semibold" style={{ color: "var(--text)" }}>
                              {item.myDisplayName}
                            </td>
                            <td className="py-3 font-semibold" style={{ color: "#ef4444" }}>
                              {item.enemyDisplayName}
                            </td>
                            <td className="py-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                              {item.games}판 ({item.wins}승 {item.losses}패)
                            </td>
                            <td className="py-3 text-center font-bold"
                              style={{ color: wr >= 0.60 ? "var(--win)" : wr >= 0.50 ? "var(--text)" : "var(--loss)" }}>
                              {Math.round(wr * 100)}%
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
