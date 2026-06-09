"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "editor" | "viewer";

interface Member {
  userId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: Role;
  joinedAt: string;
}

interface Group {
  id: string;
  name: string;
  inviteToken: string;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "관리자",
  editor: "편집자",
  viewer: "뷰어",
};

const ROLE_COLORS: Record<Role, string> = {
  admin: "#4caf50",
  editor: "#2196f3",
  viewer: "#9e9e9e",
};

export default function GroupPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("나뭇잎 마을");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  const fetchGroup = useCallback(async () => {
    const [g, m] = await Promise.all([
      fetch("/api/group").then(r => r.json()),
      fetch("/api/group/members").then(r => r.json()),
    ]);
    setGroup(g.group);
    setMembers(m.members ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  const inviteUrl = group
    ? `${window.location.origin}/invite/${group.inviteToken}`
    : "";

  async function handleCreateGroup() {
    setCreating(true);
    setError("");
    const res = await fetch("/api/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setCreating(false); return; }
    // 세션 토큰에 groupId/role 반영
    await update();
    await fetchGroup();
    setCreating(false);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerateToken() {
    if (!confirm("초대 링크를 재생성하면 기존 링크는 사용할 수 없습니다. 계속할까요?")) return;
    setRegenerating(true);
    const res = await fetch("/api/group/invite", { method: "PUT" });
    if (res.ok) await fetchGroup();
    setRegenerating(false);
  }

  async function handleRoleChange(userId: string, role: Role) {
    await fetch("/api/group/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    await fetchGroup();
  }

  async function handleRemoveMember(userId: string, name: string | null | undefined) {
    if (!confirm(`${name ?? userId}님을 그룹에서 제거할까요?`)) return;
    await fetch("/api/group/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    await fetchGroup();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg" style={{ color: "var(--text-dim)" }}>로딩 중...</div>
      </div>
    );
  }

  // ── 그룹 없음 ──────────────────────────────────────────────
  if (!group) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🏕️</div>
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--accent)" }}>
          그룹 만들기
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--text-dim)" }}>
          그룹을 만들고 친구들을 초대하세요
        </p>

        <div className="rounded-2xl p-6 text-left mb-6"
          style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
            그룹 이름
          </label>
          <input
            type="text"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "var(--hover)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            maxLength={30}
          />
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          onClick={handleCreateGroup}
          disabled={creating || !groupName.trim()}
          className="w-full py-3.5 rounded-xl font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{ background: "var(--accent)", boxShadow: "0 4px 16px rgba(76,175,80,0.35)" }}>
          {creating ? "생성 중..." : "그룹 만들기"}
        </button>
      </div>
    );
  }

  // ── 그룹 있음 ──────────────────────────────────────────────
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-black mb-1" style={{ color: "var(--accent)" }}>
        {group.name}
      </h2>
      <p className="text-sm mb-8" style={{ color: "var(--text-dim)" }}>
        내 역할: <span className="font-bold" style={{ color: ROLE_COLORS[session?.user?.role ?? "viewer"] }}>
          {ROLE_LABELS[session?.user?.role ?? "viewer"]}
        </span>
      </p>

      {/* 초대 링크 */}
      <section className="rounded-2xl p-5 mb-6"
        style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--text-muted)" }}>초대 링크</h3>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 px-3 py-2 rounded-xl text-xs truncate outline-none"
            style={{ background: "var(--hover)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
          />
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{ background: copied ? "#4caf50" : "var(--accent)", color: "#fff" }}>
            {copied ? "복사됨!" : "복사"}
          </button>
        </div>
        {isAdmin && (
          <button
            onClick={handleRegenerateToken}
            disabled={regenerating}
            className="mt-2 text-xs underline opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-dim)" }}>
            {regenerating ? "재생성 중..." : "링크 재생성"}
          </button>
        )}
      </section>

      {/* 멤버 목록 */}
      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold text-sm" style={{ color: "var(--text-muted)" }}>
            멤버 ({members.length}명)
          </h3>
        </div>
        <ul>
          {members.map((m, i) => (
            <li key={m.userId}
              className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: i < members.length - 1 ? "1px solid var(--border)" : "none" }}>
              {m.image ? (
                <img src={m.image} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: "var(--hover)", color: "var(--accent)" }}>
                  {(m.name ?? m.email)[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
                  {m.name ?? m.email}
                </div>
                <div className="text-xs truncate" style={{ color: "var(--text-dim)" }}>{m.email}</div>
              </div>

              {isAdmin && m.userId !== session?.user?.id ? (
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={e => handleRoleChange(m.userId, e.target.value as Role)}
                    className="text-xs px-2 py-1 rounded-lg outline-none"
                    style={{
                      background: "var(--hover)",
                      border: "1px solid var(--border)",
                      color: ROLE_COLORS[m.role],
                    }}>
                    <option value="admin">관리자</option>
                    <option value="editor">편집자</option>
                    <option value="viewer">뷰어</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMember(m.userId, m.name)}
                    className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-red-500/20"
                    style={{ color: "#ef4444" }}>
                    ✕
                  </button>
                </div>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: ROLE_COLORS[m.role] + "22", color: ROLE_COLORS[m.role] }}>
                  {ROLE_LABELS[m.role]}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
