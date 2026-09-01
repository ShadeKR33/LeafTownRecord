import { auth } from "@/auth";
import { Redis } from "@upstash/redis";
import { getUser, seasonsKey, nicknamesKey } from "@/lib/kvGroups";
import type { SeasonDef, NicknameEntry, SeasonTrophy } from "@/lib/types";

const kv = Redis.fromEnv();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json([]);
  const seasons = await kv.get<SeasonDef[]>(seasonsKey(user.groupId)) ?? [];
  return Response.json(seasons.sort((a, b) => b.id.localeCompare(a.id)));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json({ error: "No group" }, { status: 400 });
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Omit<SeasonDef, "closed" | "winners">;
  const seasons = await kv.get<SeasonDef[]>(seasonsKey(user.groupId)) ?? [];
  if (seasons.find(s => s.id === body.id)) {
    return Response.json({ error: "이미 존재하는 시즌입니다" }, { status: 400 });
  }
  seasons.push({ ...body, closed: false });
  await kv.set(seasonsKey(user.groupId), seasons);
  return Response.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json({ error: "No group" }, { status: 400 });
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { seasonId, winners, endDate } = await req.json() as {
    seasonId: string;
    winners: { rank1?: string; rank2?: string; rank3?: string };
    endDate?: string;
  };

  const [seasons, nicknames] = await Promise.all([
    kv.get<SeasonDef[]>(seasonsKey(user.groupId)).then(v => v ?? []),
    kv.get<NicknameEntry[]>(nicknamesKey(user.groupId)).then(v => v ?? []),
  ]);

  const idx = seasons.findIndex(s => s.id === seasonId);
  if (idx === -1) return Response.json({ error: "시즌 없음" }, { status: 404 });

  const season = seasons[idx];

  // Remove previously awarded trophies for this season (allow re-award)
  const clearedNicknames = nicknames.map(n => ({
    ...n,
    trophies: (n.trophies ?? []).filter(t => t.season !== seasonId),
  }));

  // Award new trophies
  const rankEntries: Array<{ nick: string | undefined; rank: 1 | 2 | 3 }> = [
    { nick: winners.rank1, rank: 1 },
    { nick: winners.rank2, rank: 2 },
    { nick: winners.rank3, rank: 3 },
  ];

  for (const { nick, rank } of rankEntries) {
    if (!nick) continue;
    const ni = clearedNicknames.findIndex(n => n.nickname === nick);
    if (ni !== -1) {
      const trophy: SeasonTrophy = { season: season.id, seasonLabel: season.label, rank };
      clearedNicknames[ni] = {
        ...clearedNicknames[ni],
        trophies: [...(clearedNicknames[ni].trophies ?? []), trophy],
      };
    }
  }

  seasons[idx] = { ...season, closed: true, winners, ...(endDate ? { endDate } : {}) };

  await Promise.all([
    kv.set(seasonsKey(user.groupId), seasons),
    kv.set(nicknamesKey(user.groupId), clearedNicknames),
  ]);

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json({ error: "No group" }, { status: 400 });
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { seasonId } = await req.json() as { seasonId: string };

  const [seasons, nicknames] = await Promise.all([
    kv.get<SeasonDef[]>(seasonsKey(user.groupId)).then(v => v ?? []),
    kv.get<NicknameEntry[]>(nicknamesKey(user.groupId)).then(v => v ?? []),
  ]);

  const filtered = seasons.filter(s => s.id !== seasonId);
  const clearedNicknames = nicknames.map(n => ({
    ...n,
    trophies: (n.trophies ?? []).filter(t => t.season !== seasonId),
  }));

  await Promise.all([
    kv.set(seasonsKey(user.groupId), filtered),
    kv.set(nicknamesKey(user.groupId), clearedNicknames),
  ]);

  return Response.json({ ok: true });
}
