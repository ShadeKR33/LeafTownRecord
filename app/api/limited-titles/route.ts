import { auth } from "@/auth";
import { Redis } from "@upstash/redis";
import { getUser, limitedTitlesKey, recordsKey, nicknamesKey, easterEggKey } from "@/lib/kvGroups";
import type { LimitedTitle, GameRecord, NicknameEntry } from "@/lib/types";
import { LIMITED_TITLE_DEFS } from "@/lib/limitedTitles";
import { normalizeId } from "@/lib/stats";
import { computeGameAwards } from "@/lib/awards";
import { POSITIONS, computeScore, computeRelativeWR, assignRelativeTiers } from "@/lib/championTiers";

const kv = Redis.fromEnv();

// ── 시간순 역추적 시뮬레이션 ───────────────────────────────────────────────
function findFirstAchievers(
  records: GameRecord[],
  nicknames: NicknameEntry[],
): Map<string, { holder: string; date: string }> {
  const aliasMap = new Map<string, string>();
  for (const entry of nicknames) {
    aliasMap.set(normalizeId(entry.nickname), entry.nickname);
    for (const alt of entry.altNicknames ?? []) {
      aliasMap.set(normalizeId(alt), entry.nickname);
    }
  }
  const resolve = (raw: string): string =>
    aliasMap.get(normalizeId(raw)) ?? raw;

  const sorted = [...records].sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameNumber - b.gameNumber,
  );
  const seriesMap = new Map<string, GameRecord[]>();
  for (const r of sorted) {
    if (!seriesMap.has(r.date)) seriesMap.set(r.date, []);
    seriesMap.get(r.date)!.push(r);
  }
  const seriesList = [...seriesMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  interface PS {
    wins: number; losses: number; score: number;
    currentStreak: number; maxWinStreak: number;
    kdaGames: number; kdaK: number; kdaD: number; kdaA: number;
    mvpCount: number; aceCount: number;
  }
  const pState = new Map<string, PS>();
  const getPS = (rn: string): PS => {
    if (!pState.has(rn)) {
      pState.set(rn, {
        wins: 0, losses: 0, score: 0,
        currentStreak: 0, maxWinStreak: 0,
        kdaGames: 0, kdaK: 0, kdaD: 0, kdaA: 0,
        mvpCount: 0, aceCount: 0,
      });
    }
    return pState.get(rn)!;
  };

  const champSets = new Map<string, Set<string>>();
  const getChampSet = (rn: string): Set<string> => {
    if (!champSets.has(rn)) champSets.set(rn, new Set());
    return champSets.get(rn)!;
  };

  // pioneer_champ_master: 플레이어별 챔피언 게임 수 (포지션 무관)
  const playerChampStats = new Map<string, Map<string, { games: number; wins: number }>>();

  // pioneer_meta: 포지션별 챔피언 티어 계산용 (챔피언 분석 페이지와 동일한 로직)
  const posChampPlayerStats = new Map<string, { wins: number; losses: number }>(); // key: `${player}|||${pos}|||${champ}`
  const playerOverallStats  = new Map<string, { wins: number; losses: number }>(); // key: `${player}`
  const posChampTotalStats  = new Map<string, { wins: number; losses: number; picks: number }>(); // key: `${pos}|||${champ}`
  const posChampAllPlayers  = new Map<string, Set<string>>(); // key: `${pos}|||${champ}` → players
  const banCounts = new Map<string, number>();
  let totalIndivGames = 0;

  const result = new Map<string, { holder: string; date: string }>();

  for (const [date, sRecords] of seriesList) {
    const t1W = sRecords.filter(r => r.winTeam === 1).length;
    const t2W = sRecords.filter(r => r.winTeam === 2).length;
    const needed = (sRecords[0]?.gameFormat ?? "3판2선") === "3판2선" ? 2 : 3;
    const seriesWinner = t1W >= needed ? 1 : t2W >= needed ? 2 : 0;

    // 경기별 KDA + MVP/ACE + 챔피언 기록
    for (const r of sRecords) {
      const team1Won = r.winTeam === 1;
      totalIndivGames++;

      // 밴 집계
      if (r.bans) {
        for (const c of [...(r.bans.team1 || []), ...(r.bans.team2 || [])]) {
          if (c) banCounts.set(c, (banCounts.get(c) || 0) + 1);
        }
      }

      // KDA (팀 구분 불필요)
      for (const p of [...r.team1, ...r.team2]) {
        const rn = resolve(p.nickname);
        const st = getPS(rn);
        if (p.kills !== undefined && p.deaths !== undefined && p.assists !== undefined) {
          st.kdaGames++; st.kdaK += p.kills; st.kdaD += p.deaths; st.kdaA += p.assists;
        }
        if (p.champion && p.champion !== "?") getChampSet(rn).add(p.champion);
      }

      // 챔피언 승패 기록 (팀 구분 필요)
      const champTeams: Array<[typeof r.team1, boolean]> = [
        [r.team1, team1Won],
        [r.team2, !team1Won],
      ];
      for (const [teamPlayers, teamWon] of champTeams) {
        teamPlayers.forEach((p, idx) => {
          if (!p.champion || p.champion === "?" || !p.nickname) return;
          const rn = resolve(p.nickname);
          const pos = POSITIONS[idx];

          // pioneer_champ_master: 챔피언별 게임 수 (포지션 무관)
          if (!playerChampStats.has(rn)) playerChampStats.set(rn, new Map());
          const cm = playerChampStats.get(rn)!;
          if (!cm.has(p.champion)) cm.set(p.champion, { games: 0, wins: 0 });
          const cst = cm.get(p.champion)!;
          cst.games++;
          if (teamWon) cst.wins++;

          if (!pos) return;

          // pioneer_meta: 포지션별 티어 계산용
          const pcpKey = `${rn}|||${pos}|||${p.champion}`;
          if (!posChampPlayerStats.has(pcpKey)) posChampPlayerStats.set(pcpKey, { wins: 0, losses: 0 });
          const pcpSt = posChampPlayerStats.get(pcpKey)!;
          if (teamWon) pcpSt.wins++; else pcpSt.losses++;

          if (!playerOverallStats.has(rn)) playerOverallStats.set(rn, { wins: 0, losses: 0 });
          const ovSt = playerOverallStats.get(rn)!;
          if (teamWon) ovSt.wins++; else ovSt.losses++;

          const pctKey = `${pos}|||${p.champion}`;
          if (!posChampTotalStats.has(pctKey)) posChampTotalStats.set(pctKey, { wins: 0, losses: 0, picks: 0 });
          const pctSt = posChampTotalStats.get(pctKey)!;
          pctSt.picks++;
          if (teamWon) pctSt.wins++; else pctSt.losses++;

          if (!posChampAllPlayers.has(pctKey)) posChampAllPlayers.set(pctKey, new Set());
          posChampAllPlayers.get(pctKey)!.add(rn);
        });
      }
      const awards = computeGameAwards(r.team1, r.team2, r.winTeam);
      if (awards) {
        const mvpP = awards.mvpTeam === 1 ? r.team1[awards.mvpIndex] : r.team2[awards.mvpIndex];
        const aceP = awards.aceTeam === 1 ? r.team1[awards.aceIndex] : r.team2[awards.aceIndex];
        if (mvpP?.nickname) getPS(resolve(mvpP.nickname)).mvpCount++;
        if (aceP?.nickname) getPS(resolve(aceP.nickname)).aceCount++;
      }
    }

    // 시리즈 승패·관계 통계 업데이트
    if (seriesWinner !== 0) {
      // 각 시리즈에서 팀별 고유 닉네임 수집
      const team1Nicks = new Set(sRecords.flatMap(r => r.team1.map(p => resolve(p.nickname)).filter(Boolean)));
      const team2Nicks = new Set(sRecords.flatMap(r => r.team2.map(p => resolve(p.nickname)).filter(Boolean)));
      const winSet  = seriesWinner === 1 ? team1Nicks : team2Nicks;
      const loseSet = seriesWinner === 1 ? team2Nicks : team1Nicks;

      for (const rn of [...team1Nicks, ...team2Nicks]) {
        const st = getPS(rn);
        const won = winSet.has(rn);
        if (won) {
          st.wins++; st.score += 3;
          st.currentStreak = st.currentStreak > 0 ? st.currentStreak + 1 : 1;
          st.maxWinStreak = Math.max(st.maxWinStreak, st.currentStreak);
        } else {
          st.losses++; st.score -= 1;
          st.currentStreak = st.currentStreak < 0 ? st.currentStreak - 1 : -1;
        }
      }

    }

    // 각 칭호 달성 여부 체크
    for (const [rn, st] of pState) {
      const kda = st.kdaD > 0 ? (st.kdaK + st.kdaA) / st.kdaD : (st.kdaGames > 0 ? 999 : 0);

      if (!result.has("pioneer_streak") && st.maxWinStreak >= 5)
        result.set("pioneer_streak", { holder: rn, date });

      if (!result.has("pioneer_score") && st.score >= 40)
        result.set("pioneer_score", { holder: rn, date });

      if (!result.has("pioneer_kda") && st.kdaGames >= 10 && kda >= 5.0)
        result.set("pioneer_kda", { holder: rn, date });

      if (!result.has("pioneer_mvp") && st.mvpCount >= 15)
        result.set("pioneer_mvp", { holder: rn, date });

      if (!result.has("pioneer_ace") && st.aceCount >= 10)
        result.set("pioneer_ace", { holder: rn, date });

      if (!result.has("pioneer_champ") && (champSets.get(rn)?.size ?? 0) >= 45)
        result.set("pioneer_champ", { holder: rn, date });

      if (!result.has("pioneer_champ_master")) {
        const cm = playerChampStats.get(rn);
        if (cm) {
          const maxGames = [...cm.values()].reduce((m, v) => Math.max(m, v.games), 0);
          if (maxGames >= 10) result.set("pioneer_champ_master", { holder: rn, date });
        }
      }

      // pioneer_meta는 플레이어 개별 체크가 아닌 전체 포지션 티어를 계산해야 하므로 아래 블록에서 일괄 처리

      if (result.size === LIMITED_TITLE_DEFS.length) break;
    }

    // pioneer_meta: 챔피언 분석 페이지와 동일한 기준으로 포지션별 1티어 판정
    if (!result.has("pioneer_meta") && totalIndivGames > 0) {
      // 포지션별 그룹화 → 티어 계산
      const byPos = new Map<string, Array<{ posChampKey: string; score: number; forcedUp: boolean; penalized: boolean }>>();
      for (const [pctKey, stats] of posChampTotalStats) {
        const sep = pctKey.indexOf("|||");
        const pos = pctKey.slice(0, sep);
        const champ = pctKey.slice(sep + 3);
        const wr = stats.picks > 0 ? stats.wins / stats.picks : 0;
        const pr = stats.picks / totalIndivGames;
        const br = (banCounts.get(champ) || 0) / totalIndivGames;
        const { adjWR } = computeRelativeWR(posChampPlayerStats, playerOverallStats, pos, champ, wr);
        const score = computeScore(adjWR, pr, br);
        const forcedUp = br > 0.25 && adjWR > 0.50;
        const penalized = pr < 0.10 && adjWR > 0.60;
        if (!byPos.has(pos)) byPos.set(pos, []);
        byPos.get(pos)!.push({ posChampKey: pctKey, score, forcedUp, penalized });
      }

      const tier1Keys = new Set<string>();
      for (const [pos, items] of byPos) {
        const tiers = assignRelativeTiers(items, pos);
        items.forEach((item, i) => { if (tiers[i] === 1) tier1Keys.add(item.posChampKey); });
      }

      // 플레이어별 1인픽 + 1티어 챔피언 카운트
      for (const [rn] of pState) {
        if (result.has("pioneer_meta")) break;
        let metaCount = 0;
        for (const [posChampKey, players] of posChampAllPlayers) {
          if (players.size === 1 && players.has(rn) && tier1Keys.has(posChampKey)) {
            metaCount++;
          }
        }
        if (metaCount >= 3) result.set("pioneer_meta", { holder: rn, date });
      }
    }

    if (result.size === LIMITED_TITLE_DEFS.length) break;
  }

  return result;
}

// pioneer_easter는 게임 기록 기반이 아닌 별도 KV로 관리
const EASTER_TITLE_ID = "pioneer_easter";

// ── GET: 칭호 목록 반환 ──────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json([]);

  const [existing, records, nicknames, easterRecord] = await Promise.all([
    kv.get<LimitedTitle[]>(limitedTitlesKey(user.groupId)).then(v => v ?? []),
    kv.get<GameRecord[]>(recordsKey(user.groupId)).then(v => v ?? []),
    kv.get<NicknameEntry[]>(nicknamesKey(user.groupId)).then(v => v ?? []),
    kv.get<{ holder: string; date: string }>(easterEggKey(user.groupId)),
  ]);

  const claimedIds = new Set(existing.map(t => t.id));
  const allIds = LIMITED_TITLE_DEFS.map(d => d.id);

  const newTitles: LimitedTitle[] = [];

  // 이스터에그 칭호: 별도 KV 기반
  if (!claimedIds.has(EASTER_TITLE_ID) && easterRecord) {
    newTitles.push({ id: EASTER_TITLE_ID, holder: easterRecord.holder, date: easterRecord.date });
  }

  // 게임 기록 기반 칭호
  const gameBasedUnclaimed = allIds.filter(
    id => id !== EASTER_TITLE_ID && !claimedIds.has(id)
  );
  if (gameBasedUnclaimed.length > 0 && records.length > 0) {
    const firstAchievers = findFirstAchievers(records, nicknames);
    for (const id of gameBasedUnclaimed) {
      const a = firstAchievers.get(id);
      if (a) newTitles.push({ id, holder: a.holder, date: a.date });
    }
  }

  if (newTitles.length > 0) {
    const updated = [...existing, ...newTitles];
    await kv.set(limitedTitlesKey(user.groupId), updated);
    return Response.json(updated);
  }

  return Response.json(existing);
}
