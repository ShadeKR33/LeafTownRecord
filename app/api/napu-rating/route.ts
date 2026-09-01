import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { Redis } from "@upstash/redis";
import { getUser, napuRatingsKey, recordsKey } from "@/lib/kvGroups";
import type { GameRecord, NapuSeriesRating, NapuPlayerRating } from "@/lib/types";

const kv = Redis.fromEnv();
const POS_ORDER = ["탑", "정글", "미드", "원딜", "서포터"];

function sortByPosition(players: GameRecord["team1"]): GameRecord["team1"] {
  return [...players].sort((a, b) => {
    const ai = a.position ? POS_ORDER.indexOf(a.position) : 99;
    const bi = b.position ? POS_ORDER.indexOf(b.position) : 99;
    return ai - bi;
  });
}

function hasStats(records: GameRecord[]): boolean {
  return records.some(r =>
    [...r.team1, ...r.team2].some(
      p => p.kills !== undefined && p.deaths !== undefined && p.assists !== undefined
    )
  );
}

function buildPrompt(records: GameRecord[], date: string): string {
  const sorted = [...records].sort((a, b) => a.gameNumber - b.gameNumber);
  const t1W = sorted.filter(r => r.winTeam === 1).length;
  const t2W = sorted.filter(r => r.winTeam === 2).length;
  const format = sorted[0]?.gameFormat ?? "3판2선";

  let p = `리그 오브 레전드 내전 퍼포먼스 평가를 해주세요.\n\n`;
  p += `날짜: ${date} / 형식: ${format}\n`;
  p += `시리즈: 팀1 ${t1W}승 - 팀2 ${t2W}승 (${t1W > t2W ? "팀1" : "팀2"} 우승)\n\n`;

  for (const r of sorted) {
    p += `[${r.gameNumber}경기 - ${r.winTeam === 1 ? "팀1" : "팀2"} 승]\n`;
    for (const [label, team] of [["팀1", r.team1], ["팀2", r.team2]] as const) {
      const teamKills = (team as GameRecord["team1"]).reduce((s, pl) => s + (pl.kills ?? 0), 0);
      p += `${label} (팀킬 ${teamKills}):\n`;
      for (const pl of team as GameRecord["team1"]) {
        if (!pl.nickname) continue;
        const pos = pl.position ? `(${pl.position}${pl.champion ? `/${pl.champion}` : ""})` : pl.champion ? `(${pl.champion})` : "";
        const kda = pl.kills !== undefined ? `KDA ${pl.kills}/${pl.deaths}/${pl.assists}` : "";
        const kp = pl.kills !== undefined && teamKills > 0
          ? `KP${Math.round(((pl.kills ?? 0) + (pl.assists ?? 0)) / teamKills * 100)}%`
          : "";
        const dmg = pl.damageDealt ? `딜${Math.round(pl.damageDealt / 1000)}k` : "";
        const dt = pl.damageTaken ? `받은피해${Math.round(pl.damageTaken / 1000)}k` : "";
        const cs = pl.cs ? `CS${pl.cs}` : "";
        const vs = pl.visionScore ? `시야${pl.visionScore}` : "";
        const stats = [kda, kp, dmg, dt, cs, vs].filter(Boolean).join(" ");
        p += `  ${pl.nickname}${pos ? " " + pos : ""}: ${stats || "스탯없음"}\n`;
      }
    }
    p += "\n";
  }

  p += `## 포지션별 평가 기준 (비중 순서대로)\n`;
  p += `모든 포지션 공통: KDA, CS, 딜기여도, 받은피해, 승패는 항상 반영되지만 비중이 다름.\n\n`;
  p += `- 탑: 받은피해(팀 내 비율) > KDA > CS > 딜기여도 > 킬관여율 > 승패\n`;
  p += `  → 탱커/브루저 역할 특성상 받은 피해를 많이 받을수록 팀 기여로 인정. 단 데스가 많으면 감점.\n\n`;
  p += `- 정글: 킬관여율(KP) > KDA > CS > 딜기여도 > 받은피해 > 승패\n`;
  p += `  → 적극적인 갱킹/오브젝트 기여가 핵심. KP가 낮으면 CS만 높아도 낮은 점수.\n\n`;
  p += `- 미드: 딜기여도(팀 내 비율) > KDA > CS > 킬관여율 > 받은피해 > 승패\n`;
  p += `  → 캐리 포지션이므로 팀 내 딜 비율이 압도적으로 중요.\n\n`;
  p += `- 원딜: 딜기여도(팀 내 비율) > CS > KDA > 킬관여율 > 받은피해 > 승패\n`;
  p += `  → 딜과 CS가 양대 핵심. 데스 없이 딜을 넣으면 고점수.\n\n`;
  p += `- 서포터: 킬관여율(KP) > KDA > 시야점수(상대 서포터 대비 차이) > 받은피해 > 딜기여도 > 승패\n`;
  p += `  → CS와 딜은 거의 무시. 시야점수는 양팀 서포터끼리 상대 비교. KP와 데스가 핵심.\n\n`;
  p += `공통 규칙: 전 경기 종합 평점(1.0~10.0, 소수점 1자리). 승리팀이라도 기여가 없으면 낮게, 패배팀이라도 잘했으면 높게.\n\n`;
  p += `응답: 순수 JSON 배열만, 다른 텍스트 없이.\n`;
  p += `[{"nickname":"닉네임","score":8.5},...]`;
  return p;
}

// ── GET: 특정 날짜 or 전체 평점 조회 ────────────────────────────────────
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json(null);

  const date = new URL(req.url).searchParams.get("date");
  const all = await kv.get<NapuSeriesRating[]>(napuRatingsKey(user.groupId)) ?? [];

  return Response.json(date ? (all.find(r => r.seriesDate === date) ?? null) : all);
}

// ── POST: AI 평점 생성 ───────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json({ error: "No group" }, { status: 400 });
  if (user.role === "viewer") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { date } = await req.json() as { date: string };
  if (!date) return Response.json({ error: "date required" }, { status: 400 });

  const allRecords = await kv.get<GameRecord[]>(recordsKey(user.groupId)) ?? [];
  const dayRecords = allRecords.filter(r => r.date === date);

  if (dayRecords.length === 0) return Response.json({ error: "해당 날짜 기록 없음" }, { status: 404 });
  if (!hasStats(dayRecords)) return Response.json({ error: "스탯 데이터가 입력되지 않은 시리즈입니다" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "API 키 미설정" }, { status: 500 });

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(dayRecords, date);

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });

  const rawRatings = JSON.parse(jsonMatch[0]) as NapuPlayerRating[];

  // 실제 플레이어 닉네임 수집
  const allPlayers = new Set<string>();
  for (const r of dayRecords) {
    for (const p of [...r.team1, ...r.team2]) {
      if (p.nickname) allPlayers.add(p.nickname);
    }
  }

  // AI가 반환한 닉네임을 실제 닉네임으로 정규화 (대소문자·공백 무시 매칭)
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const playerRatings: NapuPlayerRating[] = rawRatings.map(r => {
    const matched = [...allPlayers].find(n => norm(n) === norm(r.nickname));
    return { nickname: matched ?? r.nickname, score: r.score };
  });

  // 팀 구성 (첫 경기 기준, 포지션순 정렬)
  const first = [...dayRecords].sort((a, b) => a.gameNumber - b.gameNumber)[0];
  const t1W = dayRecords.filter(r => r.winTeam === 1).length;
  const t2W = dayRecords.filter(r => r.winTeam === 2).length;

  const rating: NapuSeriesRating = {
    seriesDate: date,
    generatedAt: new Date().toISOString(),
    team1Wins: t1W,
    team2Wins: t2W,
    team1Players: sortByPosition(first.team1).map(p => p.nickname).filter(Boolean),
    team2Players: sortByPosition(first.team2).map(p => p.nickname).filter(Boolean),
    ratings: playerRatings,
  };

  const existing = await kv.get<NapuSeriesRating[]>(napuRatingsKey(user.groupId)) ?? [];
  await kv.set(napuRatingsKey(user.groupId), [
    ...existing.filter(r => r.seriesDate !== date),
    rating,
  ]);

  return Response.json(rating);
}
