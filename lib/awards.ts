import type { PlayerGameData } from "./types";

// 포지션별 가중치 (7개 항목 합계 100)
// 서포터의 vision/controlWard는 팀 내 비교가 아닌 적 서포터와의 교차 비교로 계산된다.
const POSITION_WEIGHTS: Record<string, {
  combat: number; resource: number; damageDealt: number;
  tanking: number; vision: number; controlWard: number; survival: number;
}> = {
  탑:     { combat: 18, resource: 15, damageDealt: 20, tanking: 32, vision: 5,  controlWard: 2,  survival: 8  },
  정글:   { combat: 30, resource: 0,  damageDealt: 14, tanking: 15, vision: 25, controlWard: 7,  survival: 9  },
  미드:   { combat: 20, resource: 20, damageDealt: 27, tanking: 5,  vision: 10, controlWard: 0,  survival: 18 },
  원딜:   { combat: 10, resource: 20, damageDealt: 45, tanking: 2,  vision: 8,  controlWard: 0,  survival: 15 },
  // 서포터: 시야·와드는 적 서포터 대비 교차 비교로 계산. KP 게이트 + 0.78x 난이도 계수 별도 적용.
  서포터: { combat: 22, resource: 0,  damageDealt: 4,  tanking: 16, vision: 30, controlWard: 18, survival: 10 },
};
const DEFAULT_WEIGHTS = POSITION_WEIGHTS["미드"];

export function computeTeamAwardScores(
  team: PlayerGameData[],
  opponentTeam?: PlayerGameData[],
): number[] {
  const dmgTotal    = team.reduce((s, p) => s + (p.damageDealt || 0), 0);
  const dtTotal     = team.reduce((s, p) => s + (p.damageTaken || 0), 0);
  const csTotal     = team.reduce((s, p) => s + (p.cs || 0), 0);
  const visionTotal = team.reduce((s, p) => s + (p.visionScore || 0), 0);
  const cwTotal     = team.reduce((s, p) => s + (p.controlWardsBought || 0), 0);
  const killsTotal  = team.reduce((s, p) => s + (p.kills || 0), 0);
  const deathsTotal = team.reduce((s, p) => s + (p.deaths || 0), 0);

  const combatRaw   = team.map((p) =>
    Math.max(0.1, (p.kills || 0) * 2 + (p.assists || 0) * 1.5 - (p.deaths || 0) * 2)
  );
  const combatTotal = combatRaw.reduce((s, v) => s + v, 0);

  // 딜량 지배 보너스: 팀 딜 35%+ AND 2위의 1.5배+ → 최대 +20%
  const dmgShares = team.map((p) => dmgTotal > 0 ? (p.damageDealt || 0) / dmgTotal : 0);
  const dominantIdx = (() => {
    const maxIdx    = dmgShares.reduce((b, v, i) => v > dmgShares[b] ? i : b, 0);
    const maxShare  = dmgShares[maxIdx];
    const second    = dmgShares.filter((_, i) => i !== maxIdx).reduce((m, v) => Math.max(m, v), 0);
    return (dmgTotal > 0 && maxShare >= 0.35 && (second === 0 || maxShare >= second * 1.5)) ? maxIdx : -1;
  })();

  // 적 서포터 (시야 교차 비교용)
  const opponentSupport = opponentTeam?.find((p) => p.position === "서포터");

  return team.map((p, i) => {
    const w = POSITION_WEIGHTS[p.position || ""] ?? DEFAULT_WEIGHTS;

    const kp          = killsTotal > 0 ? ((p.kills || 0) + (p.assists || 0)) / killsTotal : 0;
    const kpShare     = kp * 100;
    const combatShare = combatTotal > 0 ? (combatRaw[i] / combatTotal) * 100 : 0;
    const combatScore = Math.min(100, combatShare * (1 + (kpShare / 100) * 0.5));

    const dmgShare  = dmgTotal  > 0 ? (p.damageDealt       || 0) / dmgTotal  * 100 : 0;
    const dtShare   = dtTotal   > 0 ? (p.damageTaken       || 0) / dtTotal   * 100 : 0;
    const csShare   = csTotal   > 0 ? (p.cs                || 0) / csTotal   * 100 : 0;
    const deathShare   = deathsTotal > 0 ? (p.deaths || 0) / deathsTotal * 100 : 0;
    const survivalScore = 100 - deathShare;

    let visionShare: number;
    let cwShare: number;

    if (p.position === "서포터" && opponentSupport) {
      // 적 서포터와 1:1 교차 비교 (50 = 동점, >50 = 우세)
      const myVision  = p.visionScore         || 0;
      const oppVision = opponentSupport.visionScore         || 0;
      const totalV    = myVision + oppVision;
      visionShare     = totalV > 0 ? (myVision / totalV) * 100 : 50;

      const myWards   = p.controlWardsBought  || 0;
      const oppWards  = opponentSupport.controlWardsBought  || 0;
      const totalW    = myWards + oppWards;
      cwShare         = totalW > 0 ? (myWards / totalW) * 100 : 50;
    } else {
      visionShare = visionTotal > 0 ? (p.visionScore        || 0) / visionTotal * 100 : 0;
      cwShare     = cwTotal     > 0 ? (p.controlWardsBought || 0) / cwTotal     * 100 : 0;
    }

    let base = (
      combatScore     * w.combat      +
      csShare         * w.resource    +
      dmgShare        * w.damageDealt +
      dtShare         * w.tanking     +
      visionShare     * w.vision      +
      cwShare         * w.controlWard +
      survivalScore   * w.survival
    ) / 100;

    // 딜 지배 보너스 (35%→+0%, 50%→+12%, 60%→+20% 상한)
    if (i === dominantIdx) {
      base *= 1 + Math.min(0.20, (dmgShares[i] - 0.35) * 0.8);
    }

    // KDA 가산점: KDA 2.0 이상부터 최대 +15%
    // KDA 2→+0%, 4→+6%, 6→+12%, 7↑→+15% 상한
    const kda = (p.deaths ?? 0) > 0
      ? ((p.kills ?? 0) + (p.assists ?? 0)) / (p.deaths ?? 1)
      : (p.kills ?? 0) + (p.assists ?? 0) > 0 ? 10 : 0;
    if (kda > 2.0) {
      base *= 1 + Math.min(0.15, (kda - 2.0) * 0.03);
    }

    // 서포터 난이도 계수: KP가 낮으면 대폭 감점
    // KP ≥ 70%: 0.78x (원래도 어렵게), 50~70%: 0.65x, <50%: 0.50x
    if (p.position === "서포터") {
      const kpFactor = kp >= 0.70 ? 0.78 : kp >= 0.50 ? 0.65 : 0.50;
      base *= kpFactor;
    }

    return base;
  });
}

// 승리팀 최고 기여자 = MVP, 패배팀 최고 기여자 = 에이스 (표시용)
export function computeGameAwards(
  team1: PlayerGameData[], team2: PlayerGameData[], winTeam: 1 | 2
): { mvpIndex: number; mvpTeam: 1 | 2; aceIndex: number; aceTeam: 1 | 2 } | null {
  if (team1.length === 0 || team2.length === 0) return null;

  // 양 팀을 교차 전달하여 서포터 시야 비교가 가능하도록 한다
  const team1Scores = computeTeamAwardScores(team1, team2);
  const team2Scores = computeTeamAwardScores(team2, team1);

  const argMax = (scores: number[]) => scores.reduce((best, s, i) => (s > scores[best] ? i : best), 0);

  const team1TopIdx = argMax(team1Scores);
  const team2TopIdx = argMax(team2Scores);

  const mvpTeam: 1 | 2 = winTeam;
  const aceTeam: 1 | 2 = winTeam === 1 ? 2 : 1;

  return {
    mvpIndex: mvpTeam === 1 ? team1TopIdx : team2TopIdx,
    mvpTeam,
    aceIndex: aceTeam === 1 ? team1TopIdx : team2TopIdx,
    aceTeam,
  };
}
