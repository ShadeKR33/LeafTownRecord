import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGroupByInviteToken, joinGroup, regenerateInviteToken, getGroup } from "@/lib/kvGroups";

// 초대 링크 토큰으로 그룹 정보 조회
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "토큰이 없습니다" }, { status: 400 });
  const group = await getGroupByInviteToken(token);
  if (!group) return NextResponse.json({ error: "유효하지 않은 초대 링크입니다" }, { status: 404 });
  return NextResponse.json({ group: { id: group.id, name: group.name } });
}

// 초대 링크로 그룹 참여
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "토큰이 없습니다" }, { status: 400 });

  const group = await getGroupByInviteToken(token);
  if (!group) return NextResponse.json({ error: "유효하지 않은 초대 링크입니다" }, { status: 404 });

  if (session.user.groupId && session.user.groupId !== group.id) {
    return NextResponse.json({ error: "이미 다른 그룹에 속해 있습니다" }, { status: 400 });
  }

  await joinGroup(group.id, {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    image: session.user.image,
  });

  return NextResponse.json({ success: true, groupId: group.id });
}

// 초대 링크 재생성 (admin only)
export async function PUT() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  const newToken = await regenerateInviteToken(session.user.groupId!);
  return NextResponse.json({ token: newToken });
}
