import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createGroup, disbandGroup, getGroup, getUser } from "@/lib/kvGroups";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ group: null });

  // JWT groupId 대신 KV에서 최신 정보 직접 조회
  const userData = await getUser(session.user.id);
  if (!userData?.groupId) return NextResponse.json({ group: null });

  const group = await getGroup(userData.groupId);
  return NextResponse.json({ group });
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

  const group = await createGroup(name.trim(), {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    image: session.user.image,
  });
  return NextResponse.json({ group });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userData = await getUser(session.user.id);
  if (!userData?.groupId) return NextResponse.json({ error: "그룹이 없습니다" }, { status: 400 });

  const group = await getGroup(userData.groupId);
  if (group?.ownerId !== session.user.id) {
    return NextResponse.json({ error: "관리자만 그룹을 해체할 수 있습니다" }, { status: 403 });
  }

  await disbandGroup(userData.groupId);
  return NextResponse.json({ ok: true });
}
