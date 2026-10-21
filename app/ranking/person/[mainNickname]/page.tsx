"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { computeAggregatedStats, loadGameRecords, loadNicknames, normalizeId, formatWinRate, getSeriesData } from "@/lib/stats";
import type { NicknameEntry, PlayerStats, BadgeGrade, GameRecord } from "@/lib/types";
import { WinRateTrend } from "@/components/WinRateTrend";
import { ChampionPortrait } from "@/components/ChampionPortrait";

const POSITION_ORDER = ["탑", "정글", "미드", "원딜", "서포터"];
const ROLE_COLORS: Record<string, string> = {
  탑: "#e06060", 정글: "#50a050", 미드: "#5090d0", 원딜: "#c0a030", 서포터: "#9060c0",
};
const TIER_COLORS: Record<string, string> = {
  아이언: "#6b6b6b", 브론즈: "#a05030", 실버: "#a0a8b0", 골드: "#c8a951",
  플래티넘: "#50b090", 에메랄드: "#40c070", 다이아몬드: "#6080c8",
  마스터: "#9060c0", 그랜드마스터: "#d04040", 챌린저: "#e8c030",
};
const GRADE_STYLE: Record<BadgeGrade, { label: string; color: string; bg: string }> = {
  일반: { label: "일반", color: "#78909c", bg: "#78909c22" },
  희귀: { label: "희귀", color: "#42a5f5", bg: "#42a5f522" },
  영웅: { label: "영웅", color: "#ab47bc", bg: "#ab47bc22" },
  전설: { label: "전설", color: "#ff8f00", bg: "#ff8f0022" },
  신화: { label: "신화", color: "#00e5ff", bg: "#00e5ff22" },
};

type TabKey = "overview" | "champions" | "positions" | "vs" | "with" | "badges";



export default function PersonDetailPage() {
  const { mainNickname: rawParam } = useParams();
  const mainNickname = decodeURIComponent(rawParam as string);
  const router = useRouter();

  const [entry, setEntry] = useState<NicknameEntry | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [allNicknames, setAllNicknames] = useState<string[]>([]);
  const [allRecords, setAllRecords] = useState<GameRecord[]>([]);
  const [playerNicks, setPlayerNicks] = useState<string[]>([]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [winTrend, setWinTrend] = useState<{ date: string; rate: number; won: boolean }[]>([]);

  useEffect(() => {
    Promise.all([loadGameRecords(), loadNicknames()]).then(([records, nicknameEntries]) => {
      const found: NicknameEntry | undefined = nicknameEntries.find(
        (e: NicknameEntry) => normalizeId(e.nickname) === normalizeId(mainNickname)
      );
      if (!found) { setLoading(false); return; }
      setEntry(found);

      const basNicks = [found.nickname, ...(found.altNicknames || []).filter(Boolean)];
      // 레코드에 "#KR1" 형태로 저장된 닉네임도 포함 (Riot ID 매핑 없이 등록된 경우)
      const baseNickSet = new Set(basNicks.map(n => normalizeId(n)));
      const tagVariants: string[] = [];
      for (const record of records) {
        for (const player of [...record.team1, ...record.team2]) {
          const pn = player.nickname || "";
          if (!pn.includes("#")) continue;
          const base = normalizeId(pn.split("#")[0]);
          if (baseNickSet.has(base) && !baseNickSet.has(normalizeId(pn))) {
            baseNickSet.add(normalizeId(pn));
            tagVariants.push(pn);
          }
        }
      }
      const nicks = [...basNicks, ...tagVariants];
      setAllNicknames(nicks);
      setAllRecords(records);
      setPlayerNicks(nicks);

      const displayName = found.realName?.trim() || found.nickname;
      const aggStats = computeAggregatedStats(displayName, nicks, records, nicknameEntries);
      setStats(aggStats);

      // 승률 추이 — 모든 계정 닉네임을 하나로 묶어 계산
      const normNicks = new Set(nicks.map(n => normalizeId(n)));
      const allSeries = getSeriesData(records);
      const personSeries = allSeries
        .filter(s => s.isComplete && s.records.some(r =>
          [...r.team1, ...r.team2].some(p => normNicks.has(normalizeId(p.nickname || "")))
        ))
        .map(s => {
          const t1Nicks = s.records[0]?.team1.map(p => normalizeId(p.nickname || "")) ?? [];
          const inT1 = t1Nicks.some(n => normNicks.has(n));
          return { date: s.date, won: s.winTeam === (inT1 ? 1 : 2) };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      const trend = personSeries.map((s, i) => {
        const wins = personSeries.slice(0, i + 1).filter(x => x.won).length;
        return { date: s.date, rate: wins / (i + 1), won: s.won };
      });
      setWinTrend(trend);
      setLoading(false);
    });
  }, [mainNickname]);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center" style={{ color: "var(--text-muted)" }}>
      <div className="text-3xl mb-4 animate-bounce">⏳</div>
      <p>데이터를 불러오는 중입니다...</p>
    </div>
  );

  if (!entry || !stats) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center" style={{ color: "var(--text-muted)" }}>
      <div className="text-4xl mb-4">🔍</div>
      <p>해당 플레이어를 찾을 수 없습니다.</p>
      <button onClick={() => router.back()} className="mt-6 px-4 py-2 rounded text-sm"
        style={{ background: "var(--hover)", color: "var(--accent)", border: "1px solid var(--border)" }}>← 돌아가기</button>
    </div>
  );

  const displayName = entry.realName?.trim() || entry.nickname;
  const tier = entry.tier;
  const tierColor = tier ? (TIER_COLORS[tier] || "var(--accent)") : "var(--accent)";

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview",   label: "개요" },
    { key: "champions",  label: "챔피언" },
    { key: "positions",  label: "포지션" },
    { key: "vs",         label: "상대전적" },
    { key: "with",       label: "시너지" },
    { key: "badges",     label: `업적 (${stats.badges.length})` },
  ];

  // ── 개요 ──
  const OverviewTab = () => {
    const [displayScore, setDisplayScore] = useState(0);
    useEffect(() => {
      if (!stats) return;
      const target = stats.score;
      let current = 0;
      const step = Math.max(1, Math.ceil(Math.abs(target) / 25));
      const timer = setInterval(() => {
        current += target >= 0 ? step : -step;
        if ((target >= 0 && current >= target) || (target < 0 && current <= target)) {
          current = target;
          clearInterval(timer);
        }
        setDisplayScore(current);
      }, 20);
      return () => clearInterval(timer);
    }, []);
    const getKdaCard = () => {
      if (!stats.kdaTotal || stats.kdaTotal.games === 0) {
        return { label: "평균 KDA", value: "-", sub: "기록 없음", color: "var(--text-muted)" };
      }
      const kda = stats.kdaTotal.deaths > 0
        ? (stats.kdaTotal.kills + stats.kdaTotal.assists) / stats.kdaTotal.deaths
        : null;
      const value = kda !== null ? kda.toFixed(2) : "Perfect";
      const sub = `${(stats.kdaTotal.kills / stats.kdaTotal.games).toFixed(1)} / ${(stats.kdaTotal.deaths / stats.kdaTotal.games).toFixed(1)} / ${(stats.kdaTotal.assists / stats.kdaTotal.games).toFixed(1)}`;
      const color = kda === null || kda >= 5 ? "var(--win)" : kda >= 3 ? "var(--text-muted)" : "var(--loss)";
      return { label: "평균 KDA", value, sub, color };
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "전체 승률", value: formatWinRate(stats.wins, stats.totalGames), sub: `${stats.wins}승 ${stats.losses}패`, color: "var(--accent)" },
            { label: "점수", value: `${displayScore >= 0 ? "+" : ""}${displayScore}`, sub: "승 +3 / 패 -1", color: stats.score >= 0 ? "var(--win)" : "var(--loss)" },
            { label: "총 경기", value: `${stats.totalGames}`, sub: "경기", color: "var(--text-muted)" },
            getKdaCard(),
          ].map(c => (
            <div key={c.label} className="p-4 rounded-lg border text-center" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{c.label}</div>
              <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{c.sub}</div>
            </div>
          ))}
        </div>



      <div className="p-4 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>연승/연패 기록</div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>현재</div>
            {stats.currentStreak > 0 ? <div className="font-bold" style={{ color: "var(--loss)" }}>🔥 {stats.currentStreak}연승중</div>
             : stats.currentStreak < 0 ? <div className="font-bold" style={{ color: "#1565c0" }}>💧 {Math.abs(stats.currentStreak)}연패중</div>
             : <div style={{ color: "var(--text-muted)" }}>-</div>}
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>최고 연승</div>
            <div className="font-bold text-lg" style={{ color: "var(--loss)" }}>{stats.maxWinStreak}연승</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>최고 연패</div>
            <div className="font-bold text-lg" style={{ color: "#1565c0" }}>{stats.maxLoseStreak}연패</div>
          </div>
        </div>
      </div>

      {stats.topChampions.length > 0 && (
        <div className="p-4 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>모스트 챔피언</div>
          <div className="flex gap-3 flex-wrap">
            {stats.topChampions.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: "var(--panel-alt)" }}>
                <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>#{i + 1}</span>
                <div>
                  <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>{c.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{c.games}경기 · {formatWinRate(c.wins, c.games)} 승률</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <WinRateTrend data={winTrend} />

      {stats.badges.length > 0 && (() => {
        const gradeRank: Record<string, number> = { 신화: 0, 전설: 1, 영웅: 2, 희귀: 3, 일반: 4 };
        const top3 = [...stats.badges]
          .sort((a, b) => (gradeRank[a.grade] ?? 5) - (gradeRank[b.grade] ?? 5))
          .slice(0, 3);
        return (
          <div className="p-4 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                보유 업적 ({stats.badges.length}개)
              </div>
              <button
                onClick={() => setTab("badges")}
                className="text-xs font-semibold"
                style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
                더보기 →
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {top3.map(b => {
                const gc = GRADE_STYLE[b.grade].color;
                return (
                  <div key={b.id} title={b.description} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: gc + "22", color: gc, border: `1px solid ${gc}44` }}>
                    {b.icon} {b.name}
                  </div>
                );
              })}
              {stats.badges.length > 3 && (
                <button
                  onClick={() => setTab("badges")}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
                  +{stats.badges.length - 3}개 더
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
    );
  };

  // ── 챔피언 ──
  const ChampionsTab = () => {
    const [posFilter, setPosFilter] = useState("전체");
    const [showAll, setShowAll] = useState(false);
    const [expandedKda, setExpandedKda] = useState<string | null>(null);
    const POS_LIST = ["탑", "정글", "미드", "원딜", "서포터"];
    const POSITIONS = ["전체", ...POS_LIST];
    const RANK_COLORS = ["#c8a951", "#a0a8b0", "#a05030"];

    // posFilter 바뀌면 더 보기 접기
    useEffect(() => { setShowAll(false); }, [posFilter]);

    // 포지션별 경기 수 (탭 활성화 여부 판단)
    const positionGames = useMemo(() => {
      const normNicks = new Set(playerNicks.map(n => normalizeId(n)));
      const counts: Record<string, number> = {};
      for (const record of allRecords) {
        for (const players of [record.team1, record.team2]) {
          players.forEach((player, idx) => {
            if (!normNicks.has(normalizeId(player.nickname || ""))) return;
            const pos = POS_LIST[idx] ?? "";
            if (pos) counts[pos] = (counts[pos] || 0) + 1;
          });
        }
      }
      return counts;
    }, []);

    const filteredStats = useMemo(() => {
      const normNicks = new Set(playerNicks.map(n => normalizeId(n)));
      const champMap: Record<string, { wins: number; losses: number; games: number; kills: number; deaths: number; assists: number; hasKda: boolean }> = {};

      for (const record of allRecords) {
        for (const { players, won } of [
          { players: record.team1, won: record.winTeam === 1 },
          { players: record.team2, won: record.winTeam === 2 },
        ]) {
          players.forEach((player, idx) => {
            if (!normNicks.has(normalizeId(player.nickname || ""))) return;
            const pos = POS_LIST[idx] ?? "";
            if (posFilter !== "전체" && pos !== posFilter) return;
            const champ = player.champion || "?";
            if (champ === "?") return;
            if (!champMap[champ]) champMap[champ] = { wins: 0, losses: 0, games: 0, kills: 0, deaths: 0, assists: 0, hasKda: false };
            champMap[champ].games++;
            if (won) champMap[champ].wins++;
            else champMap[champ].losses++;
            if (player.kills != null) { champMap[champ].kills += player.kills; champMap[champ].hasKda = true; }
            if (player.deaths != null) champMap[champ].deaths += player.deaths;
            if (player.assists != null) champMap[champ].assists += player.assists;
          });
        }
      }

      return Object.entries(champMap)
        .map(([name, s]) => ({ name, ...s }))
        .sort((a, b) => b.games - a.games || b.wins - a.wins);
    }, [posFilter]);

    const displayStats = showAll ? filteredStats : filteredStats.slice(0, 10);

    return (
      <div className="space-y-4">
        {/* 포지션 필터 탭 */}
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          {POSITIONS.map(pos => {
            const hasGames = pos === "전체" || (positionGames[pos] || 0) > 0;
            const isActive = posFilter === pos;
            return (
              <button key={pos}
                onClick={() => hasGames ? setPosFilter(pos) : undefined}
                title={!hasGames ? "아직 플레이하지 않은 라인입니다." : undefined}
                className="px-4 py-2.5 text-sm font-semibold transition-all"
                style={{
                  color: !hasGames ? "var(--text-dim)" : isActive ? "var(--accent)" : "var(--text-muted)",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  background: "none",
                  opacity: hasGames ? 1 : 0.35,
                  cursor: hasGames ? "pointer" : "not-allowed",
                }}>
                {pos}
              </button>
            );
          })}
        </div>

        {filteredStats.length === 0 ? (
          <div className="py-10 text-center rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
            {posFilter === "전체" ? "챔피언 기록 없음" : `${posFilter} 포지션 기록 없음`}
          </div>
        ) : (
          <>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--panel-alt)", borderBottom: "1px solid var(--border)" }}>
                    <th className="px-3 py-3 text-center" style={{ color: "var(--text-dim)", width: 40 }}>#</th>
                    <th className="px-4 py-3 text-left" style={{ color: "var(--text-muted)" }}>챔피언</th>
                    <th className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>KDA</th>
                    <th className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>판수</th>
                    <th className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>승률</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStats.map(({ name, wins, losses, games, kills, deaths, assists, hasKda }, i) => {
                    const wr = games > 0 ? wins / games : 0;
                    const kdaNum = hasKda && deaths > 0 ? (kills + assists) / deaths : null;
                    const kdaStr = hasKda ? (deaths > 0 ? kdaNum!.toFixed(2) : "Perfect") : null;
                    const wrColor = wr >= 0.6 ? "#22c55e" : wr <= 0.4 ? "var(--loss)" : "#f59e0b";
                    const avgK = hasKda ? (kills / games).toFixed(1) : null;
                    const avgD = hasKda ? (deaths / games).toFixed(1) : null;
                    const avgA = hasKda ? (assists / games).toFixed(1) : null;
                    const kdaColor = kdaStr === "Perfect" || (kdaNum != null && kdaNum >= 4) ? "var(--win)" : kdaNum != null && kdaNum >= 2 ? "var(--text)" : "var(--loss)";
                    const rankColor = i < 3 ? RANK_COLORS[i] : null;
                    const rowBg = rankColor ? rankColor + "14" : i % 2 === 0 ? "var(--panel)" : "var(--panel-alt)";

                    return (
                      <tr key={name}
                        onClick={() => router.push(`/champion/${encodeURIComponent(name)}`)}
                        className="transition-all cursor-pointer hover:brightness-95"
                        style={{ background: rowBg, borderBottom: "1px solid var(--border)", borderLeft: rankColor ? `3px solid ${rankColor}` : "3px solid transparent" }}>
                        <td className="px-3 py-3.5 text-center text-xs font-black" style={{ color: rankColor ?? "var(--text-dim)" }}>{i + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <ChampionPortrait name={name} size={36} />
                            <span className="font-semibold" style={{ color: "var(--text)" }}>{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center"
                          onClick={kdaStr ? (e) => { e.stopPropagation(); setExpandedKda(expandedKda === name ? null : name); } : undefined}
                          style={{ cursor: kdaStr ? "pointer" : "default" }}>
                          {kdaStr ? (
                            <div>
                              <div className="font-bold inline-flex items-center gap-0.5"
                                style={{ color: kdaColor, borderBottom: `1px dashed ${kdaColor}88` }}>
                                {kdaStr}
                                <span style={{ fontSize: 9, color: kdaColor + "bb", lineHeight: 1 }}>
                                  {expandedKda === name ? "▴" : "▾"}
                                </span>
                              </div>
                              {expandedKda === name && (
                                <div className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>{avgK} / {avgD} / {avgA}</div>
                              )}
                            </div>
                          ) : <span style={{ color: "var(--text-dim)" }}>-</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold" style={{ color: "var(--text-muted)" }}>{games}</td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="font-bold" style={{ color: wrColor }}>{Math.round(wr * 100)}%</div>
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>
                            <span style={{ color: "var(--win)" }}>{wins}승</span>{" / "}<span style={{ color: "var(--loss)" }}>{losses}패</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredStats.length > 10 && (
              <button onClick={() => setShowAll(v => !v)}
                className="w-full py-2.5 text-sm font-semibold rounded-lg border transition-all hover:brightness-95"
                style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
                {showAll ? "접기 ▲" : `더 보기 (${filteredStats.length - 10}개 더) ▼`}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  // ── 포지션 ──
  const PositionsTab = () => {
    const entries = POSITION_ORDER.map(pos => ({ pos, s: stats.positionStats?.[pos] }))
      .filter((e): e is { pos: string; s: NonNullable<typeof e.s> } => !!e.s);
    return (
      <div className="space-y-3">
        {entries.length === 0
          ? <div className="py-10 text-center rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text-muted)" }}>포지션 기록 없음</div>
          : entries.map(({ pos, s }) => {
            const wr = s.games > 0 ? s.wins / s.games : 0;
            const color = ROLE_COLORS[pos] || "var(--accent)";
            return (
              <div key={pos} className="p-4 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: color + "22", color, border: `1px solid ${color}44` }}>{pos}</span>
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>{s.games}경기</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--win)" }}>{s.wins}승</span> / <span style={{ color: "var(--loss)" }}>{s.losses}패</span>
                    </span>
                    <span className="font-bold" style={{ color }}>{Math.round(wr * 100)}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--hover)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${wr * 100}%`, background: color }} />
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  // ── 상대전적 ──
  const VsTab = () => {
    const entries = Object.entries(stats.vsStats).sort((a, b) => {
      const ra = a[1].wins + a[1].losses > 0 ? a[1].wins / (a[1].wins + a[1].losses) : 0;
      const rb = b[1].wins + b[1].losses > 0 ? b[1].wins / (b[1].wins + b[1].losses) : 0;
      return rb - ra;
    });
    return (
      <div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>상대방이 적팀에 있을 때 내 전적 (높을수록 상대방에 강함)</p>
        <div className="rounded-lg overflow-x-auto border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                {["상대방", "경기", "승/패", "상대 승률"].map(h => (
                  <th key={h} className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0
                ? <tr><td colSpan={4} className="py-10 text-center" style={{ color: "var(--text-muted)" }}>상대전적 없음</td></tr>
                : entries.map(([opp, s], i) => {
                  const total = s.wins + s.losses;
                  const wr = total > 0 ? s.wins / total : 0;
                  const rel = total >= 3 ? (wr >= 0.7 ? "🦁 천적" : wr <= 0.3 ? "😰 약점" : "") : "";
                  return (
                    <tr key={opp} style={{ background: i % 2 === 0 ? "var(--panel)" : "var(--panel-alt)", borderBottom: "1px solid var(--border)" }}>
                      <td className="px-4 py-3 text-center font-semibold" style={{ color: "var(--text)" }}>{opp} {rel && <span className="text-xs">{rel}</span>}</td>
                      <td className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>{total}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span style={{ color: "var(--win)" }}>{s.wins}승</span> / <span style={{ color: "var(--loss)" }}>{s.losses}패</span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold"
                        style={{ color: wr >= 0.6 ? "var(--win)" : wr <= 0.4 ? "var(--loss)" : "var(--accent)" }}>
                        {Math.round(wr * 100)}%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── 시너지 ──
  const WithTab = () => {
    const entries = Object.entries(stats.withStats).sort((a, b) => {
      const ra = a[1].wins + a[1].losses > 0 ? a[1].wins / (a[1].wins + a[1].losses) : 0;
      const rb = b[1].wins + b[1].losses > 0 ? b[1].wins / (b[1].wins + b[1].losses) : 0;
      return rb - ra;
    });
    return (
      <div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>같은 팀일 때 전적 (높을수록 찰떡 시너지)</p>
        <div className="rounded-lg overflow-x-auto border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                {["파트너", "경기", "승/패", "함께 승률"].map(h => (
                  <th key={h} className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0
                ? <tr><td colSpan={4} className="py-10 text-center" style={{ color: "var(--text-muted)" }}>시너지 기록 없음</td></tr>
                : entries.map(([partner, s], i) => {
                  const total = s.wins + s.losses;
                  const wr = total > 0 ? s.wins / total : 0;
                  const rel = total >= 3 ? (wr >= 0.7 ? "🤜 찰떡" : wr <= 0.3 ? "😬 불화" : "") : "";
                  return (
                    <tr key={partner} style={{ background: i % 2 === 0 ? "var(--panel)" : "var(--panel-alt)", borderBottom: "1px solid var(--border)" }}>
                      <td className="px-4 py-3 text-center font-semibold" style={{ color: "var(--text)" }}>{partner} {rel && <span className="text-xs">{rel}</span>}</td>
                      <td className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>{total}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span style={{ color: "var(--win)" }}>{s.wins}승</span> / <span style={{ color: "var(--loss)" }}>{s.losses}패</span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold"
                        style={{ color: wr >= 0.6 ? "var(--win)" : wr <= 0.4 ? "var(--loss)" : "var(--accent)" }}>
                        {Math.round(wr * 100)}%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── 업적 ──
  const ALL_BADGE_HINTS: { id: string; icon: string; name: string; hint: string; color: string; grade: BadgeGrade }[] = [
    // ── 일반 ──
    { id: "first",         icon: "🌱", name: "첫 걸음",        hint: "첫 경기에 참여하면 획득",                      color: "#66bb6a", grade: "일반" },
    { id: "steady",        icon: "📊", name: "착실하게",         hint: "시리즈 10경기 이상 참여",                      color: "#78909c", grade: "일반" },
    { id: "explorer",      icon: "🎭", name: "챔피언 탐험가",    hint: "5종류 이상의 챔피언 플레이",                   color: "#ab47bc", grade: "일반" },
    // ── 희귀 ──
    { id: "flow",          icon: "🌊", name: "흐름을 타다",     hint: "최고 연승 3회 이상 달성",                      color: "#29b6f6", grade: "희귀" },
    { id: "fire",          icon: "🔥", name: "불꽃전사",        hint: "최고 연승 5회 이상 달성",                      color: "#ef5350", grade: "희귀" },
    { id: "ace",           icon: "⭐", name: "신예 에이스",     hint: "10경기 이상 + 승률 60% 이상",                  color: "#ffa726", grade: "희귀" },
    { id: "diamond",       icon: "💎", name: "베테랑 닌자",     hint: "시리즈 20경기 이상 참여",                      color: "#6080c8", grade: "희귀" },
    { id: "scoreRich",     icon: "💰", name: "승점 부자",        hint: "점수 20점 이상 달성",                          color: "#f9a825", grade: "희귀" },
    { id: "unlucky",       icon: "😵", name: "끝없는 불운",      hint: "최고 연패 5회 이상 기록",                      color: "#546e7a", grade: "희귀" },
    { id: "versatile",     icon: "🎨", name: "다재다능",          hint: "10종류 이상의 챔피언 플레이",                 color: "#7c4dff", grade: "희귀" },
    { id: "champMaster",   icon: "🗡️", name: "원챔 장인",       hint: "특정 챔피언 5경기 이상 플레이",                color: "#ff7043", grade: "희귀" },
    { id: "revenge",       icon: "💢", name: "앙갚음",           hint: "특정 상대에게 3승 이상",                       color: "#f44336", grade: "희귀" },
    { id: "lion",          icon: "🦁", name: "천적 파괴자",      hint: "특정 상대에게 5승 이상",                       color: "#ef8050", grade: "희귀" },
    { id: "nemesis",       icon: "😤", name: "철천지원수",        hint: "특정 상대에게 5패 이상 당함",                 color: "#ab47bc", grade: "희귀" },
    { id: "regularRival",  icon: "🤺", name: "단골 맞대결",      hint: "특정 상대와 5번 이상 맞대결",                  color: "#5c6bc0", grade: "희귀" },
    { id: "pillar",        icon: "🏛️", name: "팀의 기둥",        hint: "특정 파트너와 10경기 이상 함께 출전",          color: "#26a69a", grade: "희귀" },
    { id: "bladeWhisper",  icon: "🗡️", name: "칼날의 속삭임",   hint: "KDA 5판 이상 기록 · 평균 KDA 5.0 이상",         color: "#e91e63", grade: "희귀" },
    { id: "immortal",      icon: "🛡️", name: "죽지 않는 닌자",  hint: "KDA 5판 이상 기록 · 평균 데스 1.5 이하",        color: "#7c4dff", grade: "희귀" },
    { id: "honeyFinder",   icon: "🍯", name: "꿀챔 발굴자",     hint: "꿀챔 판정 챔피언으로 5판 이상 + 승률 50%+",     color: "#f59e0b", grade: "희귀" },
    { id: "publicEnemy",   icon: "⚠️", name: "공공의 적",        hint: "내 모스트 챔피언이 내전에서 3회 이상 밴당함",    color: "#f97316", grade: "희귀" },
    // ── 영웅 ──
    { id: "unstoppable",   icon: "♾️", name: "무적의 닌자",     hint: "최고 연승 6회 이상 달성",                      color: "#f0d080", grade: "영웅" },
    { id: "crown",         icon: "👑", name: "승률왕",           hint: "20경기 이상 + 승률 70% 이상",                 color: "#c8a951", grade: "영웅" },
    { id: "veteran",       icon: "🏠", name: "내전의 터줏대감",  hint: "시리즈 30경기 이상 참여",                      color: "#546e7a", grade: "영웅" },
    { id: "champExpert",   icon: "🏹", name: "장인의 경지",      hint: "특정 챔피언 10경기 이상 + 승률 60% 이상",      color: "#e53935", grade: "영웅" },
    { id: "manyFaces",     icon: "🃏", name: "천의 얼굴",        hint: "20종류 이상의 챔피언 플레이",                  color: "#e91e63", grade: "영웅" },
    { id: "scoreMaster",   icon: "🎖️", name: "점수의 지배자",   hint: "점수 25점 이상 달성",                          color: "#ffd600", grade: "영웅" },
    { id: "comeback",      icon: "💪", name: "칠전팔기",          hint: "연패 3 이상 기록 후 최종 승률 50% 이상",      color: "#ef5350", grade: "영웅" },
    { id: "rival",         icon: "⚡", name: "숙명의 라이벌",    hint: "특정 상대와 10번 이상 맞대결",                 color: "#7e57c2", grade: "영웅" },
    { id: "buddy",         icon: "🤜", name: "찰떡 콤비",         hint: "특정 파트너와 5경기 이상 + 승률 70% 이상",   color: "#50a0d0", grade: "영웅" },
    { id: "longPartner",   icon: "🤝", name: "찰떡 파트너",      hint: "특정 파트너와 15경기 이상 함께 출전",          color: "#26c6da", grade: "영웅" },
    { id: "ruthless",      icon: "⚔️", name: "무자비한 닌자",   hint: "3명 이상의 상대에게 각각 5승 이상",            color: "#d32f2f", grade: "영웅" },
    { id: "jgSup",         icon: "🌙", name: "밤의 사냥꾼",      hint: "정글-서포터 콤비로 5승 이상",                  color: "#5c6bc0", grade: "영웅" },
    { id: "adcSup",        icon: "🎯", name: "무적의 바텀듀오",  hint: "원딜-서포터 콤비로 5승 이상",                  color: "#f06292", grade: "영웅" },
    { id: "topMid",        icon: "🏔️", name: "무적의 상체",     hint: "탑-미드 콤비로 5승 이상",                      color: "#8d6e63", grade: "영웅" },
    { id: "slayer",        icon: "💀", name: "학살자",            hint: "KDA 5판 이상 기록 · 평균 KDA 10.0 이상",        color: "#c62828", grade: "영웅" },
    { id: "battleDominator", icon: "💫", name: "전장의 지배자",   hint: "KDA 5판 이상 기록 · 평균 KDA 7.0 이상",         color: "#ba68c8", grade: "영웅" },
    { id: "honeyProphet",  icon: "🌿", name: "꿀챔 전도사",      hint: "꿀챔 판정 챔피언으로 10판 이상 플레이",          color: "#22c55e", grade: "영웅" },
    // ── 전설 ──
    { id: "legend",        icon: "🌟", name: "전설의 닌자",      hint: "25경기 이상 + 승률 70% 이상",                 color: "#ff6f00", grade: "전설" },
    { id: "champLegend",   icon: "⚜️", name: "챔피언 달인",      hint: "특정 챔피언 15경기 이상 + 승률 70% 이상",      color: "#ff4081", grade: "전설" },
    { id: "scoreKing",     icon: "🏆", name: "점수 제왕",         hint: "점수 35점 이상 달성",                         color: "#ff6f00", grade: "전설" },
    { id: "destroyer",     icon: "👹", name: "파괴신",            hint: "최고 연승 10회 이상 달성",                    color: "#c62828", grade: "전설" },
    { id: "eternalPartner",icon: "✨", name: "영원한 동반자",     hint: "특정 파트너와 25경기 이상 함께 출전",          color: "#4a148c", grade: "전설" },
    { id: "eternalRival",  icon: "🔮", name: "영원한 숙적",       hint: "특정 상대와 15번 이상 맞대결",                color: "#1a237e", grade: "전설" },
    { id: "champCollector",icon: "🎪", name: "챔피언 수집가",    hint: "30종류 이상의 챔피언 플레이",                    color: "#ff6f00", grade: "전설" },
    // ── 신화 ──
    { id: "guardian",      icon: "🌿", name: "나뭇잎의 수호자",  hint: "시리즈 40경기 이상 참여",                      color: "#00e5ff", grade: "신화" },
  ];

  const BadgesTab = () => {
    const [showUnearned, setShowUnearned] = useState(false);
    const earnedMap = new Map(stats.badges.map(b => [b.id, b]));
    const gradeOrder: BadgeGrade[] = ["전설", "영웅", "희귀", "일반"];
    const earnedDefs = ALL_BADGE_HINTS.filter(d => earnedMap.has(d.id))
      .sort((a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade));
    const unearnedDefs = ALL_BADGE_HINTS.filter(d => !earnedMap.has(d.id))
      .sort((a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade));

    const renderBadge = (def: typeof ALL_BADGE_HINTS[0], earned: boolean) => {
      const badge = earnedMap.get(def.id);
      const gs = GRADE_STYLE[def.grade];
      return (
        <div key={def.id} className="p-4 rounded-lg border flex items-center gap-3"
          style={{
            background: "var(--panel)",
            borderColor: earned ? gs.color + "44" : "var(--border)",
            opacity: earned ? 1 : 0.4,
            boxShadow: earned && def.grade === "전설" ? `0 0 12px ${gs.color}44` : "none",
          }}>
          <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ background: earned ? gs.color + "22" : "var(--hover)", filter: earned ? "none" : "grayscale(1)" }}>
            {def.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold" style={{ color: earned ? gs.color : "var(--text-muted)" }}>{def.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                style={{ background: gs.bg, color: gs.color, border: `1px solid ${gs.color}44` }}>{gs.label}</span>
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {earned ? badge!.description : `🔒 ${def.hint}`}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {earnedDefs.length > 0 && (
          <>
            <div className="text-xs font-bold" style={{ color: "var(--accent)" }}>보유 업적 ({earnedDefs.length}개)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {earnedDefs.map(d => renderBadge(d, true))}
            </div>
          </>
        )}
        {unearnedDefs.length > 0 && (
          <>
            <button
              onClick={() => setShowUnearned(v => !v)}
              className="flex items-center gap-2 text-xs font-bold mt-2"
              style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <span>{showUnearned ? "▲" : "▼"}</span>
              <span>미달성 업적 {unearnedDefs.length}개 {showUnearned ? "접기" : "펼치기"}</span>
            </button>
            {showUnearned && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {unearnedDefs.map(d => renderBadge(d, false))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="px-3 py-1.5 rounded text-sm"
          style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>←</button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>{displayName}</h2>

            {tier && (
              <span className="text-sm px-3 py-1 rounded-full font-bold"
                style={{ background: tierColor + "22", color: tierColor, border: `1px solid ${tierColor}44` }}>
                {tier}{!["마스터", "그랜드마스터", "챌린저"].includes(tier) ? (entry.tierDiv ? ` ${entry.tierDiv}` : "") : (entry.lp ? ` ${entry.lp}LP` : "")}
              </span>
            )}
            {(entry.roles || []).length > 0 && (
              <span className="text-sm px-3 py-1 rounded-full font-bold flex gap-1 items-center"
                style={{ background: "var(--panel-alt)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {(entry.roles || []).map((r, idx) => (
                  <span key={r} style={{ color: ROLE_COLORS[r] || "var(--accent)" }}>
                    {r}{idx < (entry.roles || []).length - 1 ? " · " : ""}
                  </span>
                ))}
              </span>
            )}
            {stats.currentStreak > 0 && (
              <span className="text-sm px-3 py-1 rounded-full font-bold"
                style={{ background: "#ffebee", color: "var(--loss)", border: "1px solid #ffcdd2" }}>
                🔥 {stats.currentStreak}연승중
              </span>
            )}
            {stats.currentStreak < 0 && (
              <span className="text-sm px-3 py-1 rounded-full font-bold"
                style={{ background: "#e3f2fd", color: "#1565c0", border: "1px solid #bbdefb" }}>
                💧 {Math.abs(stats.currentStreak)}연패중
              </span>
            )}
          </div>

          {/* 계정 정보 */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              {stats.wins}승 {stats.losses}패 · {formatWinRate(stats.wins, stats.totalGames)} · {stats.totalGames}경기 · 점수 {stats.score >= 0 ? "+" : ""}{stats.score}
            </div>
            {allNicknames.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {allNicknames.map((nick, idx) => (
                  <span key={nick} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: idx === 0 ? "var(--accent)" + "22" : "var(--hover)",
                      color: idx === 0 ? "var(--accent)" : "var(--text-dim)",
                      border: `1px solid ${idx === 0 ? "var(--accent)" + "44" : "var(--border)"}`,
                    }}>
                    {idx === 0 ? "주" : "부"}: {nick}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-semibold transition-all relative"
            style={{
              color: tab === t.key ? "var(--accent-light)" : "var(--text-muted)",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {tab === "overview"  && <OverviewTab />}
      {tab === "champions" && <ChampionsTab />}
      {tab === "positions" && <PositionsTab />}
      {tab === "vs"        && <VsTab />}
      {tab === "with"      && <WithTab />}
      {tab === "badges"    && <BadgesTab />}
    </div>
  );
}
