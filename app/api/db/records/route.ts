import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { getUser, recordsKey } from "@/lib/kvGroups";

const kv = Redis.fromEnv();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", records: [] }, { status: 401 });
  }
  const userData = await getUser(session.user.id);
  if (!userData?.groupId) return NextResponse.json({ records: [] });

  try {
    const records = (await kv.get(recordsKey(userData.groupId))) || [];
    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, records: [] }, { status: 500 });
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
    const { records } = await req.json();
    if (!Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }
    await kv.set(recordsKey(userData.groupId), records);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
