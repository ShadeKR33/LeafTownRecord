import { Redis } from "@upstash/redis";

const kv = Redis.fromEnv();

// ─── KV 키 패턴 ────────────────────────────────────────────────
const K = {
  user:      (id: string)      => `lf:user:${id}`,
  group:     (id: string)      => `lf:group:${id}`,
  members:   (groupId: string) => `lf:members:${groupId}`,
  invite:    (token: string)   => `lf:invite:${token}`,
  records:   (groupId: string) => `leaftown-game-records:${groupId}`,
  nicknames: (groupId: string) => `leaftown-nicknames:${groupId}`,
};

// 기존 단일 그룹 시절 KV 키
const LEGACY_RECORDS_KEY  = "leaftown-game-records";
const LEGACY_NICKNAMES_KEY = "leaftown-nicknames";

// ─── 타입 ────────────────────────────────────────────────────
export interface UserRecord {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  groupId?: string;
  role?: "admin" | "editor" | "viewer";
}

export interface GroupRecord {
  id: string;
  name: string;
  ownerId: string;
  inviteToken: string;
  createdAt: string;
}

export interface MemberRecord {
  userId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: "admin" | "editor" | "viewer";
  joinedAt: string;
}

// ─── 유저 ───────────────────────────────────────────────────
export async function getOrCreateUser(info: {
  id: string; email: string; name?: string | null; image?: string | null;
}): Promise<UserRecord> {
  const existing = await kv.get<UserRecord>(K.user(info.id));
  if (existing) return existing;
  const user: UserRecord = { ...info };
  await kv.set(K.user(info.id), user);
  return user;
}

export async function getUser(id: string): Promise<UserRecord | null> {
  return kv.get<UserRecord>(K.user(id));
}

export async function updateUser(id: string, data: Partial<UserRecord>): Promise<void> {
  const user = await getUser(id);
  if (!user) return;
  await kv.set(K.user(id), { ...user, ...data });
}

// ─── 그룹 ───────────────────────────────────────────────────
export async function createGroup(
  name: string,
  owner: { id: string; email: string; name?: string | null; image?: string | null }
): Promise<GroupRecord> {
  const id = crypto.randomUUID();
  const inviteToken = crypto.randomUUID();
  const group: GroupRecord = {
    id, name, ownerId: owner.id, inviteToken, createdAt: new Date().toISOString(),
  };

  const members: MemberRecord[] = [{
    userId: owner.id, email: owner.email, name: owner.name, image: owner.image,
    role: "admin", joinedAt: new Date().toISOString(),
  }];

  await Promise.all([
    kv.set(K.group(id), group),
    kv.set(K.invite(inviteToken), id),
    kv.set(K.members(id), members),
    updateUser(owner.id, { groupId: id, role: "admin" }),
  ]);

  // 기존 레거시 데이터를 그룹 네임스페이스로 1회 이전
  await migrateLegacyData(id);

  return group;
}

export async function getGroup(groupId: string): Promise<GroupRecord | null> {
  return kv.get<GroupRecord>(K.group(groupId));
}

// ─── 멤버 ───────────────────────────────────────────────────
export async function getMembers(groupId: string): Promise<MemberRecord[]> {
  return (await kv.get<MemberRecord[]>(K.members(groupId))) ?? [];
}

export async function updateMemberRole(
  groupId: string, userId: string, role: "admin" | "editor" | "viewer"
): Promise<void> {
  const members = await getMembers(groupId);
  const idx = members.findIndex(m => m.userId === userId);
  if (idx === -1) return;
  members[idx].role = role;
  await Promise.all([
    kv.set(K.members(groupId), members),
    updateUser(userId, { role }),
  ]);
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  const members = await getMembers(groupId);
  const filtered = members.filter(m => m.userId !== userId);
  await Promise.all([
    kv.set(K.members(groupId), filtered),
    updateUser(userId, { groupId: undefined, role: undefined }),
  ]);
}

// ─── 초대 ───────────────────────────────────────────────────
export async function getGroupByInviteToken(token: string): Promise<GroupRecord | null> {
  const groupId = await kv.get<string>(K.invite(token));
  if (!groupId) return null;
  return getGroup(groupId);
}

export async function regenerateInviteToken(groupId: string): Promise<string> {
  const group = await getGroup(groupId);
  if (!group) throw new Error("그룹을 찾을 수 없습니다");
  await kv.del(K.invite(group.inviteToken));
  const newToken = crypto.randomUUID();
  group.inviteToken = newToken;
  await Promise.all([
    kv.set(K.group(groupId), group),
    kv.set(K.invite(newToken), groupId),
  ]);
  return newToken;
}

export async function joinGroup(
  groupId: string,
  user: { id: string; email: string; name?: string | null; image?: string | null }
): Promise<void> {
  const members = await getMembers(groupId);
  if (members.some(m => m.userId === user.id)) return;
  members.push({
    userId: user.id, email: user.email, name: user.name, image: user.image,
    role: "viewer", joinedAt: new Date().toISOString(),
  });
  await Promise.all([
    kv.set(K.members(groupId), members),
    updateUser(user.id, { groupId, role: "viewer" }),
  ]);
}

// ─── 그룹 해체 ──────────────────────────────────────────────
export async function disbandGroup(groupId: string): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) return;

  const members = await getMembers(groupId);

  await Promise.all([
    // 모든 멤버의 groupId/role 초기화
    ...members.map(m => updateUser(m.userId, { groupId: undefined, role: undefined })),
    // 그룹 구조 키만 삭제 (기록·닉네임 데이터는 보존)
    kv.del(K.group(groupId)),
    kv.del(K.members(groupId)),
    kv.del(K.invite(group.inviteToken)),
  ]);
}

// ─── 데이터 키 (API route용 export) ─────────────────────────
export const recordsKey   = (groupId: string) => K.records(groupId);
export const nicknamesKey = (groupId: string) => K.nicknames(groupId);

// ─── 레거시 데이터 이전 ─────────────────────────────────────
async function migrateLegacyData(groupId: string): Promise<void> {
  const targetRecords   = K.records(groupId);
  const targetNicknames = K.nicknames(groupId);

  // 이미 이전 완료된 경우 스킵
  const alreadyDone = await kv.get(targetRecords);
  if (alreadyDone !== null) return;

  // 레거시 플랫 키에 데이터가 있을 때만 이전
  const records   = await kv.get<unknown[]>(LEGACY_RECORDS_KEY);
  const nicknames = await kv.get<unknown[]>(LEGACY_NICKNAMES_KEY);

  const ops: Promise<unknown>[] = [];
  if (Array.isArray(records)   && records.length   > 0) ops.push(kv.set(targetRecords,   records));
  if (Array.isArray(nicknames) && nicknames.length > 0) ops.push(kv.set(targetNicknames, nicknames));
  if (ops.length > 0) await Promise.all(ops);
}
