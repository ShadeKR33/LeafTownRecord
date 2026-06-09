import type { GameRecord, PlayerStats, Badge, NicknameEntry } from "./types";

// ─── 닉네임 정규화 (띄어쓰기/대소문자 무시) ───────────────────
export function normalizeId(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

// ─── 전체 플레이어 목록 추출 ───────────────────────────────────────────
export function getAllNicknames(records: GameRecord[]): string[] {
  const map = new Map<string, string>();
  records.forEach((r) => {
    [...r.team1, ...r.team2].forEach((p) => {
      if (!p.nickname) return;
      const norm = normalizeId(p.nickname);
      // 스페이스바가 없는 정상 닉네임을 우선적으로 디스플레이용으로 채택합니다.
      if (!map.has(norm) || (map.get(norm)!.includes(" ") && !p.nickname.includes(" "))) {
        map.set(norm, p.nickname);
      }
    });
  });
  return Array.from(map.values()).sort();
}

// ─── 날짜별 시리즈 판별 ───────────────────────────────────────────
export function getSeriesData(records: GameRecord[]) {
  const seriesMap: Record<string, { date: string, format: string, records: GameRecord[], isComplete: boolean, winTeam: 0|1|2 }> = {};

  records.forEach(r => {
    if (!seriesMap[r.date]) {
      seriesMap[r.date] = { date: r.date, format: r.gameFormat, records: [], isComplete: false, winTeam: 0 };
    }
    seriesMap[r.date].records.push(r);
  });

  Object.values(seriesMap).forEach(series => {
    const t1Wins = series.records.filter(r => r.winTeam === 1).length;
    const t2Wins = series.records.filter(r => r.winTeam === 2).length;
    const needed = series.format === "3판2선" ? 2 : 3;

    if (t1Wins >= needed) {
      series.isComplete = true;
      series.winTeam = 1;
    } else if (t2Wins >= needed) {
      series.isComplete = true;
      series.winTeam = 2;
    }
  });

  return Object.values(seriesMap).sort((a,b) => a.date.localeCompare(b.date));
}

// ─── 꿀챔피언 목록 계산 (전체 레코드 기준) ─────────────────────────────
export function computeHoneyChamps(records: GameRecord[]): Set<string> {
  const POS = ["탑", "정글", "미드", "원딜", "서포터"] as const;
  const total = records.length;
  if (total === 0) return new Set();

  function _score(wr: number, pr: number, br: number): number {
    let s = 0;
    if (wr >= 0.70) s += 50; else if (wr >= 0.60) s += 40; else if (wr >= 0.55) s += 32;
    else if (wr >= 0.50) s += 24; else if (wr >= 0.45) s += 16; else s += 8;
    if (br >= 0.40) s += 35; else if (br >= 0.25) s += 28; else if (br >= 0.15) s += 20; else if (br >= 0.05) s += 12;
    if (pr >= 0.40) s += 15; else if (pr >= 0.20) s += 12; else if (pr >= 0.10) s += 8; else if (pr >= 0.05) s += 4;
    return s;
  }

  function _tiers(items: Array<{ score: number; forcedUp: boolean; penalized: boolean }>, pos: string): number[] {
    if (items.length === 0) return [];
    const eff = items.map(c => c.forcedUp ? 9999 : c.penalized ? c.score - 15 : c.score);
    const uniq = [...new Set(eff)].sort((a, b) => b - a);
    const m = uniq.length;
    return eff.map(e => {
      if (e === 9999 || m === 1) return 1;
      const pct = uniq.indexOf(e) / (m - 1);
      if (pos === "탑") {
        if (pct <= 0.12) return 1; if (pct <= 0.28) return 2;
        if (pct <= 0.48) return 3; if (pct <= 0.72) return 4; return 5;
      }
      if (pct <= 0.20) return 1; if (pct <= 0.40) return 2;
      if (pct <= 0.60) return 3; if (pct <= 0.80) return 4; return 5;
    });
  }

  const pcMap = new Map<string, { w: number; l: number; p: number }>();
  const plMap = new Map<string, { w: number; l: number }>();
  const banMap = new Map<string, number>();

  records.forEach(r => {
    const proc = (team: GameRecord["team1"], won: boolean) => {
      team.forEach((p, idx) => {
        if (!p.champion || p.champion === "?") return;
        const pos = POS[idx]; if (!pos) return;
        const gk = `${pos}|||${p.champion}`;
        if (!pcMap.has(gk)) pcMap.set(gk, { w: 0, l: 0, p: 0 });
        const g = pcMap.get(gk)!; g.p++; if (won) g.w++; else g.l++;
        const pk = `${p.nickname}|||${gk}`;
        if (!plMap.has(pk)) plMap.set(pk, { w: 0, l: 0 });
        const s = plMap.get(pk)!; if (won) s.w++; else s.l++;
      });
    };
    proc(r.team1, r.winTeam === 1);
    proc(r.team2, r.winTeam === 2);
    if (r.bans) {
      [...(r.bans.team1 || []), ...(r.bans.team2 || [])].forEach(c => {
        if (c) banMap.set(c, (banMap.get(c) || 0) + 1);
      });
    }
  });

  const honey = new Set<string>();

  POS.forEach(pos => {
    const items: Array<{ champion: string; score: number; forcedUp: boolean; penalized: boolean; wr: number }> = [];
    pcMap.forEach((s, key) => {
      if (!key.startsWith(`${pos}|||`) || s.p < 1) return;
      const champ = key.slice(pos.length + 3);
      const wr = s.w / s.p, pr = s.p / total, br = (banMap.get(champ) || 0) / total;
      items.push({ champion: champ, score: _score(wr, pr, br), forcedUp: br > 0.25 && wr > 0.50, penalized: pr < 0.10 && wr > 0.60, wr });
    });
    if (!items.length) return;
    const tiers = _tiers(items, pos);
    items.forEach((it, i) => {
      if (tiers[i] !== 1 || it.wr < 0.52) return;
      const suffix = `|||${pos}|||${it.champion}`;
      const players: { picks: number; wr: number }[] = [];
      plMap.forEach((s, k) => {
        if (!k.endsWith(suffix)) return;
        const picks = s.w + s.l;
        if (picks >= 1) players.push({ picks, wr: picks > 0 ? s.w / picks : 0 });
      });
      if (players.length < 2) return;
      players.sort((a, b) => a.picks - b.picks);
      const half = Math.ceil(players.length / 2);
      const bWR = players.slice(0, half).reduce((sum, p) => sum + p.wr, 0) / half;
      const ep = players.slice(half);
      if (!ep.length) return;
      const eWR = ep.reduce((sum, p) => sum + p.wr, 0) / ep.length;
      if (Math.abs(eWR - bWR) < 0.20) honey.add(it.champion);
    });
  });

  return honey;
}

// ─── 특정 플레이어 통계 계산 ──────────────────────────────────────────
export function computePlayerStats(nickname: string, records: GameRecord[], nicknameEntries?: NicknameEntry[]): PlayerStats {
  // 닉네임 → 실명 변환 맵
  const dnMap = new Map<string, string>();
  if (nicknameEntries) {
    nicknameEntries.forEach(e => {
      const dn = e.realName?.trim() || e.nickname;
      dnMap.set(normalizeId(e.nickname), dn);
      (e.altNicknames || []).filter(Boolean).forEach(alt => dnMap.set(normalizeId(alt.trim()), dn));
    });
  }
  const toDisplayName = (nick: string) => dnMap.get(normalizeId(nick)) ?? nick;
  type PGame = { record: GameRecord; team: 1 | 2; won: boolean; data: (typeof records[0]["team1"][0]); index: number };

  const normTarget = normalizeId(nickname);
  const playerGames: PGame[] = [];
  records.forEach((r) => {
    const idxT1 = r.team1.findIndex((p) => normalizeId(p.nickname || "") === normTarget);
    const idxT2 = r.team2.findIndex((p) => normalizeId(p.nickname || "") === normTarget);
    if (idxT1 !== -1) playerGames.push({ record: r, team: 1, won: r.winTeam === 1, data: r.team1[idxT1], index: idxT1 });
    else if (idxT2 !== -1) playerGames.push({ record: r, team: 2, won: r.winTeam === 2, data: r.team2[idxT2], index: idxT2 });
  });

  // 날짜 오름차순 정렬
  playerGames.sort((a, b) => {
    const d = a.record.date.localeCompare(b.record.date);
    return d !== 0 ? d : a.record.gameNumber - b.record.gameNumber;
  });

  // ─── 시리즈(다전제) 단위 승패/점수 및 연승 계산 ───
  const allSeries = getSeriesData(records);
  const playerSeries = allSeries
    .filter(s => s.isComplete && s.records.some(r => r.team1.some(p => normalizeId(p.nickname || "") === normTarget) || r.team2.some(p => normalizeId(p.nickname || "") === normTarget)))
    .map(s => {
      let t1Count = 0; let t2Count = 0;
      s.records.forEach(r => {
        if (r.team1.find(p => normalizeId(p.nickname || "") === normTarget)) t1Count++;
        if (r.team2.find(p => normalizeId(p.nickname || "") === normTarget)) t2Count++;
      });
      const team = t1Count >= t2Count ? 1 : 2;
      return { date: s.date, won: s.winTeam === team, records: s.records };
    });

  const wins = playerSeries.filter((s) => s.won).length;
  const losses = playerSeries.filter((s) => !s.won).length;
  const totalGames = wins + losses; // 시리즈 참여 횟수
  const score = wins * 3 - losses;

  let currentStreak = 0;
  if (playerSeries.length > 0) {
    const lastWon = playerSeries[playerSeries.length - 1].won;
    for (let i = playerSeries.length - 1; i >= 0; i--) {
      if (playerSeries[i].won === lastWon) {
        currentStreak += lastWon ? 1 : -1;
      } else break;
    }
  }

  let maxWinStreak = 0, maxLoseStreak = 0, tempW = 0, tempL = 0;
  for (const s of playerSeries) {
    if (s.won) { tempW++; tempL = 0; maxWinStreak = Math.max(maxWinStreak, tempW); }
    else       { tempL++; tempW = 0; maxLoseStreak = Math.max(maxLoseStreak, tempL); }
  }

  // ─── 챔피언 (단판 기준 통계) ───
  const championStats: PlayerStats["championStats"] = {};
  const kdaTotal = { kills: 0, deaths: 0, assists: 0, games: 0 };
  playerGames.forEach((g) => {
    const champ = g.data.champion?.trim() || "?";
    if (!championStats[champ]) championStats[champ] = { wins: 0, losses: 0, games: 0, kills: 0, deaths: 0, assists: 0 };
    championStats[champ].games++;
    if (g.won) championStats[champ].wins++; else championStats[champ].losses++;
    if (g.data.kills !== undefined) {
      const k = g.data.kills ?? 0, d = g.data.deaths ?? 0, a = g.data.assists ?? 0;
      championStats[champ].kills = (championStats[champ].kills ?? 0) + k;
      championStats[champ].deaths = (championStats[champ].deaths ?? 0) + d;
      championStats[champ].assists = (championStats[champ].assists ?? 0) + a;
      kdaTotal.kills += k; kdaTotal.deaths += d; kdaTotal.assists += a; kdaTotal.games++;
    }
  });

  const topChampions = Object.entries(championStats)
    .filter(([n]) => n !== "?")
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 3)
    .map(([name, s]) => ({ name, wins: s.wins, losses: s.losses, games: s.games }));

  // ─── 포지션, 맞라인 적팀, 아군 시너지 (시리즈 승패 기준) ───
  const positionStats: PlayerStats["positionStats"] = {};
  const vsStats: PlayerStats["vsStats"] = {};
  const withStats: PlayerStats["withStats"] = {};
  const POSITIONS = ["탑", "정글", "미드", "원딜", "서포터"];

  // 닉네임 표시명 통일을 위한 헬퍼 (스페이스가 없는 이름 선호)
  const getDisplayName = (names: string[]) => {
    return names.sort((a, b) => (a.includes(" ") ? 1 : 0) - (b.includes(" ") ? 1 : 0))[0];
  };

  playerSeries.forEach(series => {
    const seriesPositions = new Set<string>();
    // 같은 상대를 정규화 키로 묶기 위해 map 사용
    const seriesEnemies = new Map<string, string>(); 
    const seriesAllies = new Map<string, string>();

    series.records.forEach(g => {
      const idxT1 = g.team1.findIndex((p) => normalizeId(p.nickname || "") === normTarget);
      const idxT2 = g.team2.findIndex((p) => normalizeId(p.nickname || "") === normTarget);
      const myIndex = idxT1 !== -1 ? idxT1 : idxT2;
      const myTeam = idxT1 !== -1 ? 1 : (idxT2 !== -1 ? 2 : -1);

      if (myIndex !== -1 && myTeam !== -1) {
        seriesPositions.add(POSITIONS[myIndex] || "알수없음");
        
        const enemies = myTeam === 1 ? g.team2 : g.team1;
        const opponent = enemies[myIndex];
        if (opponent && opponent.nickname) {
          seriesEnemies.set(normalizeId(opponent.nickname), opponent.nickname);
        }

        const allies = myTeam === 1 ? g.team1 : g.team2;
        allies.forEach(a => {
          if (a.nickname && normalizeId(a.nickname) !== normTarget) {
            seriesAllies.set(normalizeId(a.nickname), a.nickname);
          }
        });
      }
    });

    seriesPositions.forEach(pos => {
      if (!positionStats[pos]) positionStats[pos] = { wins: 0, losses: 0, games: 0 };
      positionStats[pos].games++;
      if (series.won) positionStats[pos].wins++; else positionStats[pos].losses++;
    });

    Array.from(seriesEnemies.values()).forEach(e => {
      const key = toDisplayName(e);
      if (!vsStats[key]) vsStats[key] = { wins: 0, losses: 0 };
      if (series.won) vsStats[key].wins++; else vsStats[key].losses++;
    });

    Array.from(seriesAllies.values()).forEach(a => {
      const key = toDisplayName(a);
      if (!withStats[key]) withStats[key] = { wins: 0, losses: 0 };
      if (series.won) withStats[key].wins++; else withStats[key].losses++;
    });
  });

  // ─── 포지션 듀오 통계 (정글-서포터 / 원딜-서포터 / 탑-미드) ───
  type DuoKey = "jgSup" | "adcSup" | "topMid";
  const posDuoStats: Record<DuoKey, Record<string, { wins: number; losses: number }>> = {
    jgSup: {}, adcSup: {}, topMid: {},
  };
  playerSeries.forEach(series => {
    const counted = new Set<string>();
    series.records.forEach(g => {
      const idxT1 = g.team1.findIndex(p => normalizeId(p.nickname || "") === normTarget);
      const idxT2 = g.team2.findIndex(p => normalizeId(p.nickname || "") === normTarget);
      const myIndex = idxT1 !== -1 ? idxT1 : idxT2;
      const myTeam = idxT1 !== -1 ? 1 : idxT2 !== -1 ? 2 : -1;
      if (myIndex === -1 || myTeam === -1) return;
      const allies = myTeam === 1 ? g.team1 : g.team2;
      const pairs: Array<[number, DuoKey]> = [];
      if (myIndex === 0) pairs.push([2, "topMid"]);
      if (myIndex === 1) pairs.push([4, "jgSup"]);
      if (myIndex === 2) pairs.push([0, "topMid"]);
      if (myIndex === 3) pairs.push([4, "adcSup"]);
      if (myIndex === 4) { pairs.push([1, "jgSup"]); pairs.push([3, "adcSup"]); }
      pairs.forEach(([pIdx, key]) => {
        const partner = allies[pIdx];
        if (!partner?.nickname) return;
        const uid = `${key}-${normalizeId(partner.nickname)}`;
        if (counted.has(uid)) return;
        counted.add(uid);
        const partnerKey = toDisplayName(partner.nickname);
        if (!posDuoStats[key][partnerKey]) posDuoStats[key][partnerKey] = { wins: 0, losses: 0 };
        if (series.won) posDuoStats[key][partnerKey].wins++;
        else posDuoStats[key][partnerKey].losses++;
      });
    });
  });

  const honeyChamps = computeHoneyChamps(records);
  const champBanCounts: Record<string, number> = {};
  records.forEach(r => {
    if (!r.bans) return;
    [...(r.bans.team1 || []), ...(r.bans.team2 || [])].forEach(c => {
      if (c) champBanCounts[c] = (champBanCounts[c] || 0) + 1;
    });
  });

  const badges = computeBadges({
    totalGames, winRate: totalGames > 0 ? wins / totalGames : 0,
    currentStreak, maxWinStreak, maxLoseStreak, score, championStats, vsStats, withStats, posDuoStats,
    kdaTotal: kdaTotal.games > 0 ? kdaTotal : undefined,
    honeyChamps,
    champBanCounts,
  });

  return {
    nickname, wins, losses, totalGames,
    kdaTotal: kdaTotal.games > 0 ? kdaTotal : undefined,
    winRate: totalGames > 0 ? wins / totalGames : 0,
    score,
    currentStreak, maxWinStreak, maxLoseStreak,
    topChampions, championStats, positionStats, vsStats, withStats, badges,
    honeyChamps,
    champBanCounts,
  };
}

// ─── 업적 뱃지 계산 ──────────────────────────────────────────────────
function computeBadges(s: {
  totalGames: number; winRate: number; score: number;
  currentStreak: number; maxWinStreak: number; maxLoseStreak: number;
  championStats: PlayerStats["championStats"];
  vsStats: PlayerStats["vsStats"]; withStats: PlayerStats["withStats"];
  posDuoStats: Record<"jgSup" | "adcSup" | "topMid", Record<string, { wins: number; losses: number }>>;
  kdaTotal?: { kills: number; deaths: number; assists: number; games: number };
  honeyChamps?: Set<string>;
  champBanCounts?: Record<string, number>;
}): Badge[] {
  const badges: Badge[] = [];

  // ── 일반 (1) ──
  if (s.totalGames >= 1)
    badges.push({ id: "first", icon: "🌱", name: "첫 걸음", description: "첫 경기에 참여했습니다", color: "#66bb6a", grade: "일반" });

  // ── 희귀 (15) ──
  if (s.maxWinStreak >= 3)
    badges.push({ id: "flow", icon: "🌊", name: "흐름을 타다", description: `최고 ${s.maxWinStreak}연승 달성`, color: "#29b6f6", grade: "희귀" });

  if (s.maxWinStreak >= 5)
    badges.push({ id: "fire", icon: "🔥", name: "불꽃전사", description: `최고 ${s.maxWinStreak}연승 달성`, color: "#ef5350", grade: "희귀" });

  if (s.totalGames >= 10 && s.winRate >= 0.6)
    badges.push({ id: "ace", icon: "⭐", name: "신예 에이스", description: `승률 ${Math.round(s.winRate * 100)}% (${s.totalGames}경기)`, color: "#ffa726", grade: "희귀" });

  if (s.totalGames >= 10)
    badges.push({ id: "steady", icon: "📊", name: "착실하게", description: `총 ${s.totalGames}경기 참여`, color: "#78909c", grade: "일반" });

  if (s.totalGames >= 30)
    badges.push({ id: "diamond", icon: "💎", name: "베테랑 닌자", description: `총 ${s.totalGames}경기 참여`, color: "#6080c8", grade: "희귀" });

  if (s.score >= 20)
    badges.push({ id: "scoreRich", icon: "💰", name: "승점 부자", description: `점수 ${s.score}점 달성`, color: "#f9a825", grade: "희귀" });

  if (s.maxLoseStreak >= 5)
    badges.push({ id: "unlucky", icon: "😵", name: "끝없는 불운", description: `최고 ${s.maxLoseStreak}연패 기록`, color: "#546e7a", grade: "희귀" });

  const champEntries = Object.entries(s.championStats).filter(([n]) => n !== "?");
  const uniqueChamps = champEntries.length;
  if (uniqueChamps >= 5)
    badges.push({ id: "explorer", icon: "🎭", name: "챔피언 탐험가", description: `5종류 이상 달성 · 현재 ${uniqueChamps}종류 플레이`, color: "#ab47bc", grade: "일반" });

  if (uniqueChamps >= 10)
    badges.push({ id: "versatile", icon: "🎨", name: "다재다능", description: `10종류 이상 달성 · 현재 ${uniqueChamps}종류 플레이`, color: "#7c4dff", grade: "희귀" });

  const champMaster = champEntries.filter(([, v]) => v.games >= 5).sort((a, b) => b[1].games - a[1].games)[0];
  if (champMaster)
    badges.push({ id: "champMaster", icon: "🗡️", name: "원챔 장인", description: `${champMaster[0]} ${champMaster[1].games}경기 (${champMaster[1].wins}승 ${champMaster[1].losses}패)`, color: "#ff7043", grade: "희귀" });

  const revenge = Object.entries(s.vsStats).filter(([, v]) => v.wins >= 3).sort((a, b) => b[1].wins - a[1].wins)[0];
  if (revenge)
    badges.push({ id: "revenge", icon: "💢", name: "앙갚음", description: `vs ${revenge[0]} · ${revenge[1].wins}승 ${revenge[1].losses}패`, color: "#f44336", grade: "희귀" });

  const nemesisKill = Object.entries(s.vsStats).filter(([, v]) => v.wins >= 5).sort((a, b) => b[1].wins - a[1].wins)[0];
  if (nemesisKill)
    badges.push({ id: "lion", icon: "🦁", name: "천적 파괴자", description: `vs ${nemesisKill[0]} · ${nemesisKill[1].wins}승 ${nemesisKill[1].losses}패`, color: "#ef8050", grade: "희귀" });

  const nemesis = Object.entries(s.vsStats).filter(([, v]) => v.losses >= 5).sort((a, b) => b[1].losses - a[1].losses)[0];
  if (nemesis)
    badges.push({ id: "nemesis", icon: "😤", name: "철천지원수", description: `vs ${nemesis[0]} · ${nemesis[1].wins}승 ${nemesis[1].losses}패`, color: "#ab47bc", grade: "희귀" });

  const regularRival = Object.entries(s.vsStats).filter(([, v]) => v.wins + v.losses >= 5).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))[0];
  if (regularRival)
    badges.push({ id: "regularRival", icon: "🤺", name: "단골 맞대결", description: `vs ${regularRival[0]} · ${regularRival[1].wins + regularRival[1].losses}번 맞대결`, color: "#5c6bc0", grade: "희귀" });

  const pillar = Object.entries(s.withStats).filter(([, v]) => v.wins + v.losses >= 10).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))[0];
  if (pillar)
    badges.push({ id: "pillar", icon: "🏛️", name: "팀의 기둥", description: `with ${pillar[0]} · ${pillar[1].wins + pillar[1].losses}경기 출전 (${pillar[1].wins}승 ${pillar[1].losses}패)`, color: "#26a69a", grade: "희귀" });

  if (s.kdaTotal && s.kdaTotal.games >= 5) {
    const avgD = s.kdaTotal.deaths / s.kdaTotal.games;
    const kdaRatio = s.kdaTotal.deaths > 0
      ? (s.kdaTotal.kills + s.kdaTotal.assists) / s.kdaTotal.deaths : 999;
    const kdaStr = s.kdaTotal.deaths > 0
      ? ((s.kdaTotal.kills + s.kdaTotal.assists) / s.kdaTotal.deaths).toFixed(2) : "Perfect";
    if (kdaRatio >= 5.0)
      badges.push({ id: "bladeWhisper", icon: "🗡️", name: "칼날의 속삭임",
        description: `평균 KDA ${kdaStr} (${s.kdaTotal.games}판)`, color: "#e91e63", grade: "희귀" });
    if (avgD <= 1.5)
      badges.push({ id: "immortal", icon: "🛡️", name: "죽지 않는 닌자",
        description: `평균 데스 ${avgD.toFixed(1)}회 (${s.kdaTotal.games}판)`, color: "#7c4dff", grade: "희귀" });
  }

  if (s.honeyChamps && s.honeyChamps.size > 0) {
    const honeyGame5 = champEntries
      .filter(([name, data]) => s.honeyChamps!.has(name) && data.games >= 5 && data.wins / data.games >= 0.5)
      .sort((a, b) => b[1].games - a[1].games)[0];
    if (honeyGame5)
      badges.push({ id: "honeyFinder", icon: "🍯", name: "꿀챔 발굴자",
        description: `${honeyGame5[0]} ${honeyGame5[1].games}판 플레이 (꿀챔)`, color: "#f59e0b", grade: "희귀" });
  }

  if (s.champBanCounts && champEntries.length > 0) {
    const mostPlayed = [...champEntries].sort((a, b) => b[1].games - a[1].games)[0];
    if (mostPlayed && (s.champBanCounts[mostPlayed[0]] || 0) >= 3)
      badges.push({ id: "publicEnemy", icon: "⚠️", name: "공공의 적",
        description: `${mostPlayed[0]} 밴 ${s.champBanCounts[mostPlayed[0]]}회 (내 모스트)`, color: "#f97316", grade: "희귀" });
  }

  // ── 영웅 (15) ──
  if (s.maxWinStreak >= 6)
    badges.push({ id: "unstoppable", icon: "♾️", name: "무적의 닌자", description: `최고 ${s.maxWinStreak}연승 달성!`, color: "#f0d080", grade: "영웅" });

  if (s.totalGames >= 20 && s.winRate >= 0.7)
    badges.push({ id: "crown", icon: "👑", name: "승률왕", description: `승률 ${Math.round(s.winRate * 100)}% (${s.totalGames}경기)`, color: "#c8a951", grade: "영웅" });

  if (s.totalGames >= 50)
    badges.push({ id: "veteran", icon: "🏠", name: "내전의 터줏대감", description: `총 ${s.totalGames}경기 참여`, color: "#546e7a", grade: "영웅" });

  const champExpert = champEntries.filter(([, v]) => v.games >= 10 && v.wins / v.games >= 0.6).sort((a, b) => b[1].games - a[1].games)[0];
  if (champExpert)
    badges.push({ id: "champExpert", icon: "🏹", name: "장인의 경지", description: `${champExpert[0]} ${champExpert[1].games}경기 · 승률 ${Math.round(champExpert[1].wins / champExpert[1].games * 100)}%`, color: "#e53935", grade: "영웅" });

  const champLegend = champEntries.filter(([, v]) => v.games >= 15 && v.wins / v.games >= 0.7).sort((a, b) => b[1].games - a[1].games)[0];
  if (champLegend)
    badges.push({ id: "champLegend", icon: "⚜️", name: "챔피언 달인", description: `${champLegend[0]} ${champLegend[1].games}경기 · 승률 ${Math.round(champLegend[1].wins / champLegend[1].games * 100)}%`, color: "#ff4081", grade: "전설" });

  if (uniqueChamps >= 20)
    badges.push({ id: "manyFaces", icon: "🃏", name: "천의 얼굴", description: `${uniqueChamps}종류의 챔피언 플레이`, color: "#e91e63", grade: "영웅" });

  if (s.score >= 25)
    badges.push({ id: "scoreMaster", icon: "🎖️", name: "점수의 지배자", description: `점수 ${s.score}점 달성`, color: "#ffd600", grade: "영웅" });

  if (s.score >= 35)
    badges.push({ id: "scoreKing", icon: "🏆", name: "점수 제왕", description: `점수 ${s.score}점 달성`, color: "#ff6f00", grade: "전설" });

  if (s.maxLoseStreak >= 3 && s.totalGames >= 10 && s.winRate >= 0.5)
    badges.push({ id: "comeback", icon: "💪", name: "칠전팔기", description: `${s.maxLoseStreak}연패 극복 · 최종 승률 ${Math.round(s.winRate * 100)}%`, color: "#ef5350", grade: "영웅" });

  const rival = Object.entries(s.vsStats).filter(([, v]) => v.wins + v.losses >= 10).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))[0];
  if (rival)
    badges.push({ id: "rival", icon: "⚡", name: "숙명의 라이벌", description: `vs ${rival[0]} · ${rival[1].wins + rival[1].losses}번 맞대결 (${rival[1].wins}승 ${rival[1].losses}패)`, color: "#7e57c2", grade: "영웅" });

  const bestBuddy = Object.entries(s.withStats).filter(([, v]) => v.wins + v.losses >= 5 && v.wins / (v.wins + v.losses) >= 0.7).sort((a, b) => (b[1].wins / (b[1].wins + b[1].losses)) - (a[1].wins / (a[1].wins + a[1].losses)))[0];
  if (bestBuddy)
    badges.push({ id: "buddy", icon: "🤜", name: "찰떡 콤비", description: `with ${bestBuddy[0]} · ${bestBuddy[1].wins + bestBuddy[1].losses}경기 승률 ${Math.round(bestBuddy[1].wins / (bestBuddy[1].wins + bestBuddy[1].losses) * 100)}% (${bestBuddy[1].wins}승 ${bestBuddy[1].losses}패)`, color: "#50a0d0", grade: "영웅" });

  const longPartner = Object.entries(s.withStats).filter(([, v]) => v.wins + v.losses >= 15).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))[0];
  if (longPartner)
    badges.push({ id: "longPartner", icon: "🤝", name: "찰떡 파트너", description: `with ${longPartner[0]} · ${longPartner[1].wins + longPartner[1].losses}경기 함께 (${longPartner[1].wins}승 ${longPartner[1].losses}패)`, color: "#26c6da", grade: "영웅" });

  const dominatedOpponents = Object.entries(s.vsStats).filter(([, v]) => v.wins >= 5);
  if (dominatedOpponents.length >= 3)
    badges.push({ id: "ruthless", icon: "⚔️", name: "무자비한 닌자", description: `${dominatedOpponents.length}명의 상대에게 5승 이상`, color: "#d32f2f", grade: "영웅" });

  const jgSupBest = Object.entries(s.posDuoStats.jgSup).filter(([, v]) => v.wins >= 5).sort((a, b) => b[1].wins - a[1].wins)[0];
  if (jgSupBest)
    badges.push({ id: "jgSup", icon: "🌙", name: "밤의 사냥꾼", description: `with ${jgSupBest[0]} · ${jgSupBest[1].wins}승 ${jgSupBest[1].losses}패 (정글-서포터)`, color: "#5c6bc0", grade: "영웅" });

  const adcSupBest = Object.entries(s.posDuoStats.adcSup).filter(([, v]) => v.wins >= 5).sort((a, b) => b[1].wins - a[1].wins)[0];
  if (adcSupBest)
    badges.push({ id: "adcSup", icon: "🎯", name: "무적의 바텀듀오", description: `with ${adcSupBest[0]} · ${adcSupBest[1].wins}승 ${adcSupBest[1].losses}패 (원딜-서포터)`, color: "#f06292", grade: "영웅" });

  const topMidBest = Object.entries(s.posDuoStats.topMid).filter(([, v]) => v.wins >= 5).sort((a, b) => b[1].wins - a[1].wins)[0];
  if (topMidBest)
    badges.push({ id: "topMid", icon: "🏔️", name: "무적의 상체", description: `with ${topMidBest[0]} · ${topMidBest[1].wins}승 ${topMidBest[1].losses}패 (탑-미드)`, color: "#8d6e63", grade: "영웅" });

  if (s.kdaTotal && s.kdaTotal.games >= 5) {
    const kdaRatio = s.kdaTotal.deaths > 0
      ? (s.kdaTotal.kills + s.kdaTotal.assists) / s.kdaTotal.deaths : 999;
    const kdaStr = s.kdaTotal.deaths > 0
      ? ((s.kdaTotal.kills + s.kdaTotal.assists) / s.kdaTotal.deaths).toFixed(2) : "Perfect";
    if (kdaRatio >= 7.0)
      badges.push({ id: "battleDominator", icon: "💫", name: "전장의 지배자",
        description: `평균 KDA ${kdaStr} (${s.kdaTotal.games}판)`, color: "#ba68c8", grade: "영웅" });
    if (kdaRatio >= 10.0)
      badges.push({ id: "slayer", icon: "💀", name: "학살자",
        description: `평균 KDA ${kdaStr} (${s.kdaTotal.games}판)`, color: "#c62828", grade: "영웅" });
  }

  if (s.honeyChamps && s.honeyChamps.size > 0) {
    const honeyGame10 = champEntries
      .filter(([name, data]) => s.honeyChamps!.has(name) && data.games >= 10)
      .sort((a, b) => b[1].games - a[1].games)[0];
    if (honeyGame10)
      badges.push({ id: "honeyProphet", icon: "🌿", name: "꿀챔 전도사",
        description: `${honeyGame10[0]} ${honeyGame10[1].games}판 플레이 (꿀챔)`, color: "#22c55e", grade: "영웅" });
  }

  // ── 전설 (5) ──
  if (s.totalGames >= 25 && s.winRate >= 0.7)
    badges.push({ id: "legend", icon: "🌟", name: "전설의 닌자", description: `${s.totalGames}경기 승률 ${Math.round(s.winRate * 100)}%`, color: "#ff6f00", grade: "전설" });

  if (uniqueChamps >= 30)
    badges.push({ id: "champCollector", icon: "🎪", name: "챔피언 수집가",
      description: `${uniqueChamps}종류의 챔피언 플레이`, color: "#ff6f00", grade: "전설" });

  if (s.totalGames >= 40)
    badges.push({ id: "guardian", icon: "🌿", name: "나뭇잎의 수호자", description: `총 ${s.totalGames}경기 참여`, color: "#00e5ff", grade: "신화" });

  if (s.maxWinStreak >= 10)
    badges.push({ id: "destroyer", icon: "👹", name: "파괴신", description: `최고 ${s.maxWinStreak}연승 달성`, color: "#c62828", grade: "전설" });

  const eternalPartner = Object.entries(s.withStats).filter(([, v]) => v.wins + v.losses >= 25).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))[0];
  if (eternalPartner)
    badges.push({ id: "eternalPartner", icon: "✨", name: "영원한 동반자", description: `with ${eternalPartner[0]} · ${eternalPartner[1].wins + eternalPartner[1].losses}경기 함께 (${eternalPartner[1].wins}승 ${eternalPartner[1].losses}패)`, color: "#4a148c", grade: "전설" });

  const eternalRival = Object.entries(s.vsStats).filter(([, v]) => v.wins + v.losses >= 15).sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))[0];
  if (eternalRival)
    badges.push({ id: "eternalRival", icon: "🔮", name: "영원한 숙적", description: `vs ${eternalRival[0]} · ${eternalRival[1].wins + eternalRival[1].losses}번 맞대결 (${eternalRival[1].wins}승 ${eternalRival[1].losses}패)`, color: "#1a237e", grade: "전설" });

  return badges;
}

// ─── 여러 계정 합산 통계 ──────────────────────────────────────────────
export function computeAggregatedStats(displayName: string, nicknames: string[], records: GameRecord[], nicknameEntries?: NicknameEntry[]): PlayerStats {
  if (nicknames.length === 1) {
    const s = computePlayerStats(nicknames[0], records, nicknameEntries);
    return { ...s, nickname: displayName };
  }

  const allStats = nicknames.map((n) => computePlayerStats(n, records, nicknameEntries));

  const wins = allStats.reduce((sum, s) => sum + s.wins, 0);
  const losses = allStats.reduce((sum, s) => sum + s.losses, 0);
  const totalGames = wins + losses;
  const score = wins * 3 - losses;
  const winRate = totalGames > 0 ? wins / totalGames : 0;

  // 현재 연승은 절대값이 가장 큰 계정 기준
  const currentStreak = allStats.reduce((best, s) =>
    Math.abs(s.currentStreak) > Math.abs(best) ? s.currentStreak : best, 0);
  const maxWinStreak = allStats.reduce((m, s) => Math.max(m, s.maxWinStreak), 0);
  const maxLoseStreak = allStats.reduce((m, s) => Math.max(m, s.maxLoseStreak), 0);

  const championStats: PlayerStats["championStats"] = {};
  allStats.forEach((s) => {
    Object.entries(s.championStats).forEach(([champ, data]) => {
      if (!championStats[champ]) championStats[champ] = { wins: 0, losses: 0, games: 0, kills: 0, deaths: 0, assists: 0 };
      championStats[champ].wins += data.wins;
      championStats[champ].losses += data.losses;
      championStats[champ].games += data.games;
      if (data.kills !== undefined) {
        championStats[champ].kills = (championStats[champ].kills ?? 0) + (data.kills ?? 0);
        championStats[champ].deaths = (championStats[champ].deaths ?? 0) + (data.deaths ?? 0);
        championStats[champ].assists = (championStats[champ].assists ?? 0) + (data.assists ?? 0);
      }
    });
  });

  const topChampions = Object.entries(championStats)
    .filter(([n]) => n !== "?")
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 3)
    .map(([name, s]) => ({ name, wins: s.wins, losses: s.losses, games: s.games }));

  // 여러 계정의 vsStats / withStats 합산
  const vsStats: PlayerStats["vsStats"] = {};
  allStats.forEach(s => {
    Object.entries(s.vsStats).forEach(([opp, data]) => {
      if (!vsStats[opp]) vsStats[opp] = { wins: 0, losses: 0 };
      vsStats[opp].wins += data.wins;
      vsStats[opp].losses += data.losses;
    });
  });

  const withStats: PlayerStats["withStats"] = {};
  allStats.forEach(s => {
    Object.entries(s.withStats).forEach(([partner, data]) => {
      if (!withStats[partner]) withStats[partner] = { wins: 0, losses: 0 };
      withStats[partner].wins += data.wins;
      withStats[partner].losses += data.losses;
    });
  });

  // 포지션 합산
  const positionStats: PlayerStats["positionStats"] = {};
  allStats.forEach(s => {
    Object.entries(s.positionStats || {}).forEach(([pos, data]) => {
      if (!positionStats[pos]) positionStats[pos] = { wins: 0, losses: 0, games: 0 };
      positionStats[pos].wins += data.wins;
      positionStats[pos].losses += data.losses;
      positionStats[pos].games += data.games;
    });
  });

  const emptyDuo = { jgSup: {}, adcSup: {}, topMid: {} } as Record<"jgSup"|"adcSup"|"topMid", Record<string, {wins:number;losses:number}>>;

  const kdaAgg = { kills: 0, deaths: 0, assists: 0, games: 0 };
  allStats.forEach(s => {
    if (s.kdaTotal) {
      kdaAgg.kills += s.kdaTotal.kills;
      kdaAgg.deaths += s.kdaTotal.deaths;
      kdaAgg.assists += s.kdaTotal.assists;
      kdaAgg.games += s.kdaTotal.games;
    }
  });
  const kdaTotal = kdaAgg.games > 0 ? kdaAgg : undefined;

  const honeyChamps = computeHoneyChamps(records);
  const champBanCounts: Record<string, number> = {};
  records.forEach(r => {
    if (!r.bans) return;
    [...(r.bans.team1 || []), ...(r.bans.team2 || [])].forEach(c => {
      if (c) champBanCounts[c] = (champBanCounts[c] || 0) + 1;
    });
  });

  const badges = computeBadges({
    totalGames, winRate, score,
    currentStreak, maxWinStreak, maxLoseStreak,
    championStats, vsStats, withStats,
    posDuoStats: emptyDuo,
    kdaTotal,
    honeyChamps,
    champBanCounts,
  });

  return {
    nickname: displayName,
    wins, losses, totalGames, winRate, score,
    currentStreak, maxWinStreak, maxLoseStreak,
    topChampions, championStats,
    positionStats, vsStats, withStats,
    badges,
    kdaTotal,
    honeyChamps,
    champBanCounts,
  };
}

// ─── 유틸 ─────────────────────────────────────────────────────────────
export async function loadGameRecords(): Promise<GameRecord[]> {
  try {
    const res = await fetch("/api/db/records");
    if (!res.ok) throw new Error("Failed to load records");
    const data = await res.json();
    return data.records || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function saveGameRecords(records: GameRecord[]): Promise<void> {
  try {
    await fetch("/api/db/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records })
    });
  } catch (err) {
    console.error(err);
  }
}

export async function loadNicknames(): Promise<any[]> {
  try {
    const res = await fetch("/api/db/nicknames");
    if (!res.ok) throw new Error("Failed to load nicknames");
    const data = await res.json();
    return data.nicknames || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function saveNicknames(nicknames: any[]): Promise<void> {
  try {
    await fetch("/api/db/nicknames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nicknames })
    });
  } catch (err) {
    console.error(err);
  }
}

export function formatWinRate(wins: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((wins / total) * 100)}%`;
}
