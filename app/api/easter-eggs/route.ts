import { auth } from "@/auth";
import { Redis } from "@upstash/redis";
import { getUser, easterEggKey, nicknamesKey } from "@/lib/kvGroups";
import { normalizeId } from "@/lib/stats";
import type { NicknameEntry } from "@/lib/types";

const kv = Redis.fromEnv();

const ADMIN_EMAIL = "a93460504@gmail.com";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return Response.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }

  // 관리자 제외
  if (session.user.email.toLowerCase() === ADMIN_EMAIL) {
    return Response.json({ ok: false, reason: "excluded" });
  }

  const user = await getUser(session.user.id);
  if (!user?.groupId) return Response.json({ ok: false });

  const key = easterEggKey(user.groupId);
  const existing = await kv.get<{ holder: string; date: string }>(key);
  if (existing) return Response.json({ ok: false, reason: "already_claimed" });

  // 닉네임 테이블에서 해당 유저의 대표 닉네임 조회
  const nicknames = await kv.get<NicknameEntry[]>(nicknamesKey(user.groupId)).then(v => v ?? []);
  const userName = session.user.name ?? user.name ?? "";
  const normalizedName = normalizeId(userName);

  let holder = userName;
  for (const entry of nicknames) {
    if (
      normalizeId(entry.nickname) === normalizedName ||
      (entry.altNicknames ?? []).some(a => normalizeId(a) === normalizedName)
    ) {
      holder = entry.nickname;
      break;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  await kv.set(key, { holder, date: today });

  return Response.json({ ok: true });
}
