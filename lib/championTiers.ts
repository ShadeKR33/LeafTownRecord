// 챔피언 분석 페이지와 limited-titles API 공통 티어 계산 로직

export const POSITIONS = ["탑", "정글", "미드", "원딜", "서포터"] as const;
export type Position = (typeof POSITIONS)[number];
export type Tier = 1 | 2 | 3 | 4 | 5;

// score = adjWR 구간 + 밴율 + 픽율 가중 합산
export function computeScore(wr: number, pr: number, br: number): number {
  let s = 0;
  if (wr >= 0.70) s += 50; else if (wr >= 0.60) s += 40; else if (wr >= 0.55) s += 32;
  else if (wr >= 0.50) s += 24; else if (wr >= 0.45) s += 16; else s += 8;
  if (br >= 0.40) s += 35; else if (br >= 0.25) s += 28; else if (br >= 0.15) s += 20; else if (br >= 0.05) s += 12;
  if (pr >= 0.40) s += 15; else if (pr >= 0.20) s += 12; else if (pr >= 0.10) s += 8; else if (pr >= 0.05) s += 4;
  return s;
}

// 잘하는 사람이 픽해서 챔피언이 강해 보이는 왜곡 보정
// playerMap key: `${nickname}|||${pos}|||${champion}`
// playerOverallMap key: `${nickname}`
export function computeRelativeWR(
  playerMap: Map<string, { wins: number; losses: number }>,
  playerOverallMap: Map<string, { wins: number; losses: number }>,
  pos: string,
  champion: string,
  fallbackWR: number,
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

// 포지션 내 상대 백분위로 티어 1~5 배분
export function assignRelativeTiers(
  items: Array<{ score: number; forcedUp: boolean; penalized: boolean }>,
  position?: string,
): Tier[] {
  if (items.length === 0) return [];
  const effScores = items.map(c => c.forcedUp ? 9999 : c.penalized ? c.score - 15 : c.score);
  const unique = [...new Set(effScores)].sort((a, b) => b - a);
  const m = unique.length;
  return effScores.map(eff => {
    if (eff === 9999) return 1 as Tier;
    if (m === 1) return 1 as Tier;
    const rank = unique.indexOf(eff);
    const pct = rank / (m - 1);
    if (position === "탑") {
      if (pct <= 0.15) return 1 as Tier;
      if (pct <= 0.32) return 2 as Tier;
      if (pct <= 0.52) return 3 as Tier;
      if (pct <= 0.75) return 4 as Tier;
      return 5 as Tier;
    }
    if (position === "서포터") {
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
