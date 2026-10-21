import { auth } from "@/auth";
import { Redis } from "@upstash/redis";
import { getUser, nicknamesKey } from "@/lib/kvGroups";
import type { NicknameEntry, SeasonTrophy } from "@/lib/types";

const kv = Redis.fromEnv();

// POST: 트로피 수여 (신규 또는 덮어쓰기)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json({ error: "No group" }, { status: 400 });
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { trophyKey, label, type, rank1, rank2, rank3, members } = await req.json() as {
    trophyKey: string;
    label: string;
    type: "worlds" | "season";
    rank1?: string;
    rank2?: string;
    rank3?: string;
    members?: string[];  // 월즈: 팀원 최대 5명
  };

  const nicknames = await kv.get<NicknameEntry[]>(nicknamesKey(user.groupId)).then(v => v ?? []);

  // 기존 동일 키 트로피 제거 (재수여 허용)
  const cleared = nicknames.map(n => ({
    ...n,
    trophies: (n.trophies ?? []).filter(t => t.season !== trophyKey),
  }));

  // 새 트로피 부여
  const awards: Array<{ nick: string; rank: 1 | 2 | 3; trophyType?: "worlds" | "season" }> =
    type === "worlds"
      ? (members ?? []).filter(Boolean).map(nick => ({ nick, rank: 1 as const, trophyType: "worlds" as const }))
      : [
          ...(rank1 ? [{ nick: rank1, rank: 1 as const }] : []),
          ...(rank2 ? [{ nick: rank2, rank: 2 as const }] : []),
          ...(rank3 ? [{ nick: rank3, rank: 3 as const }] : []),
        ];

  for (const { nick, rank, trophyType } of awards) {
    const ni = cleared.findIndex(n => n.nickname === nick);
    if (ni === -1) continue;
    const trophy: SeasonTrophy = {
      season: trophyKey,
      seasonLabel: label,
      rank,
      ...(trophyType ? { type: trophyType } : {}),
    };
    cleared[ni] = { ...cleared[ni], trophies: [...(cleared[ni].trophies ?? []), trophy] };
  }

  await kv.set(nicknamesKey(user.groupId), cleared);
  return Response.json({ ok: true });
}

// DELETE: 트로피 배치 전체 삭제
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json({ error: "No group" }, { status: 400 });
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { trophyKey } = await req.json() as { trophyKey: string };
  const nicknames = await kv.get<NicknameEntry[]>(nicknamesKey(user.groupId)).then(v => v ?? []);
  const cleared = nicknames.map(n => ({
    ...n,
    trophies: (n.trophies ?? []).filter(t => t.season !== trophyKey),
  }));
  await kv.set(nicknamesKey(user.groupId), cleared);
  return Response.json({ ok: true });
}
