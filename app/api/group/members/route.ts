import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMembers, updateMemberRole, removeMember, getUser } from "@/lib/kvGroups";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ members: [] });

  const userData = await getUser(session.user.id);
  if (!userData?.groupId) return NextResponse.json({ members: [] });

  const members = await getMembers(userData.groupId);
  return NextResponse.json({ members });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userData = await getUser(session.user.id);
  if (userData?.role !== "admin") return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  const { userId, role } = await req.json();
  if (!userId || !["admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  await updateMemberRole(userData.groupId!, userId, role);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userData = await getUser(session.user.id);
  if (userData?.role !== "admin") return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });

  await removeMember(userData.groupId!, userId);
  return NextResponse.json({ success: true });
}
