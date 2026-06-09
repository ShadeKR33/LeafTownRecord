import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { getUser, createGroup } from "@/lib/kvGroups";

const kv = Redis.fromEnv();

const LEGACY_RECORDS_KEY   = "leaftown-game-records";
const LEGACY_NICKNAMES_KEY = "leaftown-nicknames";

async function findBestRecords(): Promise<unknown[] | null> {
  // 1순위: 레거시 플랫 키
  const flat = await kv.get<unknown[]>(LEGACY_RECORDS_KEY);
  if (Array.isArray(flat) && flat.length > 0) return flat;

  // 2순위: 네임스페이스 키 중 데이터가 있는 것 탐색 (복구 전용)
  const [, keys] = await kv.scan(0, { match: "leaftown-game-records:*", count: 100 });
  let best: unknown[] | null = null;
  for (const key of keys) {
    const data = await kv.get<unknown[]>(key);
    if (Array.isArray(data) && data.length > 0) {
      if (!best || data.length > best.length) best = data;
    }
  }
  return best;
}

async function findBestNicknames(): Promise<unknown[] | null> {
  const flat = await kv.get<unknown[]>(LEGACY_NICKNAMES_KEY);
  if (Array.isArray(flat) && flat.length > 0) return flat;

  const [, keys] = await kv.scan(0, { match: "leaftown-nicknames:*", count: 100 });
  let best: unknown[] | null = null;
  for (const key of keys) {
    const data = await kv.get<unknown[]>(key);
    if (Array.isArray(data) && data.length > 0) {
      if (!best || data.length > best.length) best = data;
    }
  }
  return best;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userData = await getUser(session.user.id);
  if (userData?.groupId) {
    return NextResponse.json({ error: "이미 그룹에 속해 있습니다" }, { status: 400 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "그룹 이름을 입력해주세요" }, { status: 400 });
  }

  // KV 전체에서 복구 가능한 데이터 탐색
  const [records, nicknames] = await Promise.all([
    findBestRecords(),
    findBestNicknames(),
  ]);

  // 새 그룹 생성
  const group = await createGroup(name.trim(), {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    image: session.user.image,
  });

  const recordsKey   = `leaftown-game-records:${group.id}`;
  const nicknamesKey = `leaftown-nicknames:${group.id}`;

  // 찾은 데이터를 새 그룹에 복사
  const ops: Promise<unknown>[] = [];
  if (records)   ops.push(kv.set(recordsKey,   records));
  if (nicknames) ops.push(kv.set(nicknamesKey, nicknames));
  if (ops.length > 0) await Promise.all(ops);

  return NextResponse.json({
    group,
    restored: {
      records:   records?.length   ?? 0,
      nicknames: nicknames?.length ?? 0,
    },
  });
}
