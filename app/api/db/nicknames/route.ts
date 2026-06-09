import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { getUser, nicknamesKey } from "@/lib/kvGroups";

const kv = Redis.fromEnv();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", nicknames: [] }, { status: 401 });
  }
  const userData = await getUser(session.user.id);
  if (!userData?.groupId) return NextResponse.json({ nicknames: [] });

  try {
    const nicknames = (await kv.get(nicknamesKey(userData.groupId))) || [];
    return NextResponse.json({ nicknames });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, nicknames: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userData = await getUser(session.user.id);
  if (!userData?.groupId) return NextResponse.json({ error: "그룹이 없습니다" }, { status: 403 });
  if (userData.role === "viewer") return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  try {
    const { nicknames } = await req.json();
    if (!Array.isArray(nicknames)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }
    await kv.set(nicknamesKey(userData.groupId), nicknames);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
