import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { getUser, journeyKey } from "@/lib/kvGroups";

const kv = Redis.fromEnv();

// 저장된 적이 없으면 milestones: null → 클라이언트가 기본값/기존 로컬 데이터 사용
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", milestones: null }, { status: 401 });
  }
  const userData = await getUser(session.user.id);
  if (!userData?.groupId) return NextResponse.json({ milestones: null, canEdit: false });

  const milestones = await kv.get(journeyKey(userData.groupId));
  return NextResponse.json({ milestones: milestones ?? null, canEdit: userData.role !== "viewer" });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userData = await getUser(session.user.id);
  if (!userData?.groupId) return NextResponse.json({ error: "그룹이 없습니다" }, { status: 403 });
  if (userData.role === "viewer") return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  const { milestones } = await req.json();
  if (!Array.isArray(milestones)) {
    return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
  }
  await kv.set(journeyKey(userData.groupId), milestones);
  return NextResponse.json({ success: true });
}
