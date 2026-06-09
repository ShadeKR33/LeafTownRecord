"use client";

import { useState, useEffect } from "react";
import { loadNicknames, saveNicknames, loadGameRecords, saveGameRecords, normalizeId } from "@/lib/stats";
import type { NicknameEntry } from "@/lib/types";

type NicknameForm = Omit<NicknameEntry, "id" | "altNicknames"> & {
  altNickname1: string;
  altNickname2: string;
};

const TIERS = ["아이언", "브론즈", "실버", "골드", "플래티넘", "에메랄드", "다이아몬드", "마스터", "그랜드마스터", "챌린저"];
const ALL_ROLES = ["탑", "정글", "미드", "원딜", "서포터"];

const TIER_COLORS: Record<string, string> = {
  아이언: "#6b6b6b", 브론즈: "#a05030", 실버: "#a0a8b0",
  골드: "#c8a951", 플래티넘: "#50b090", 에메랄드: "#40c070",
  다이아몬드: "#6080c8", 마스터: "#9060c0", 그랜드마스터: "#d04040", 챌린저: "#e8c030",
};

const ROLE_COLORS: Record<string, string> = {
  탑: "#e06060", 정글: "#50a050", 미드: "#5090d0", 원딜: "#c0a030", 서포터: "#9060c0",
};

const emptyForm = (): NicknameForm => ({
  nickname: "",
  altNickname1: "",
  altNickname2: "",
  realName: "",
  tier: "골드",
  tierDiv: "4",
  lp: "",
  roles: [],
});

export default function NicknamePage() {
  const [players, setPlayers] = useState<NicknameEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<NicknameForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [renameModal, setRenameModal] = useState<{ playerId: string; oldNickname: string; newNickname: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameResult, setRenameResult] = useState<{ count: number } | null>(null);

  useEffect(() => {
    loadNicknames().then((data) => {
      setPlayers(data);
      setLoading(false);
    });
  }, []);

  const save = async (data: NicknameEntry[]) => {
    setPlayers(data);
    await saveNicknames(data);
  };

  const handleSubmit = () => {
    if (!form.nickname.trim()) return;
    const altNicknames = [form.altNickname1.trim(), form.altNickname2.trim()].filter(Boolean);
    const entry: Omit<NicknameEntry, "id"> = {
      nickname: form.nickname,
      altNicknames,
      realName: form.realName,
      tier: form.tier,
      tierDiv: form.tierDiv,
      lp: form.lp,
      roles: form.roles,
    };
    if (editId) {
      save(players.map((p) => (p.id === editId ? { ...entry, id: editId } : p)));
      setEditId(null);
    } else {
      save([...players, { ...entry, id: Date.now().toString() }]);
    }
    setForm(emptyForm());
    setShowForm(false);
  };

  const startEdit = (p: NicknameEntry) => {
    setForm({
      nickname: p.nickname,
      altNickname1: p.altNicknames?.[0] || "",
      altNickname2: p.altNicknames?.[1] || "",
      realName: p.realName,
      tier: p.tier,
      tierDiv: p.tierDiv || "4",
      lp: p.lp || "",
      roles: p.roles || [],
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const deletePlayer = (id: string) => {
    save(players.filter((p) => p.id !== id));
  };

  const applyRename = async () => {
    if (!renameModal || !renameModal.newNickname.trim()) return;
    const { playerId, oldNickname, newNickname } = renameModal;
    const trimmedNew = newNickname.trim();
    if (normalizeId(oldNickname) === normalizeId(trimmedNew)) {
      setRenameModal(null);
      return;
    }
    setRenaming(true);
    setRenameResult(null);
    try {
      const records = await loadGameRecords();
      const normalizedOld = normalizeId(oldNickname);
      let count = 0;
      const updatedRecords = records.map(r => ({
        ...r,
        team1: r.team1.map(p => {
          if (normalizeId(p.nickname || "") === normalizedOld) { count++; return { ...p, nickname: trimmedNew }; }
          return p;
        }),
        team2: r.team2.map(p => {
          if (normalizeId(p.nickname || "") === normalizedOld) { count++; return { ...p, nickname: trimmedNew }; }
          return p;
        }),
      }));
      const updatedPlayers = players.map(p =>
        p.id === playerId ? { ...p, nickname: trimmedNew } : p
      );
      await saveGameRecords(updatedRecords);
      await saveNicknames(updatedPlayers);
      setPlayers(updatedPlayers);
      setRenameResult({ count });
      setRenameModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setRenaming(false);
    }
  };

  const toggleRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* 닉네임 변경 모달 */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => !renaming && setRenameModal(null)}>
          <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1" style={{ color: "var(--text)" }}>닉네임 변경</h3>
            <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
              게임 기록 전체에서 이전 닉네임이 새 닉네임으로 교체됩니다.
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>현재 닉네임</label>
                <div className="px-3 py-2 rounded text-sm font-semibold" style={{ background: "var(--hover)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
                  {renameModal.oldNickname}
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>새 닉네임</label>
                <input autoFocus className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ background: "var(--panel-alt)", border: "1px solid var(--accent)", color: "var(--text)" }}
                  placeholder="변경할 닉네임 입력"
                  value={renameModal.newNickname}
                  onChange={e => setRenameModal({ ...renameModal, newNickname: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && applyRename()}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={applyRename} disabled={renaming || !renameModal.newNickname.trim()}
                className="flex-1 py-2.5 rounded-lg font-bold text-sm"
                style={{ background: renaming || !renameModal.newNickname.trim() ? "var(--border)" : "#f9a825", color: "#fff", cursor: renaming ? "not-allowed" : "pointer" }}>
                {renaming ? "변경 중..." : "변경 적용"}
              </button>
              <button onClick={() => setRenameModal(null)} disabled={renaming}
                className="px-5 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 변경 완료 토스트 */}
      {renameResult && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-2xl"
          style={{ background: "#1b5e20", color: "#a5d6a7", border: "1px solid #2e7d32" }}>
          ✅ 닉네임 변경 완료 — 게임 기록 {renameResult.count}건 업데이트
          <button onClick={() => setRenameResult(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--accent)" }}>👥 닉네임 명단</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }}
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--panel-alt)" }}
        >
          + 멤버 추가
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center" style={{ color: "var(--text-muted)" }}>
          <div className="text-3xl mb-4 animate-bounce">🤖</div>
          <p>명단 데이터를 서버에서 불러오는 중입니다...</p>
        </div>
      ) : (
        <>
          {/* 수동 등록 폼 */}
          {showForm && (
            <div className="mb-6 p-5 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--accent)" }}>
                {editId ? "멤버 수정" : "새 멤버 추가"}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {/* 기본 정보 */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>인게임 닉네임 (주계정)</label>
                  <input className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                    placeholder="주계정 닉네임" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>실명/별명</label>
                  <input className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                    value={form.realName}
                    onChange={(e) => setForm({ ...form, realName: e.target.value })}
                    placeholder="실명 또는 별명" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>티어</label>
                    <select className="w-full px-3 py-2 rounded text-sm"
                      style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                      value={form.tier}
                      onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                      {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {!["마스터", "그랜드마스터", "챌린저"].includes(form.tier) ? (
                    <div className="w-20">
                      <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>단계</label>
                      <select className="w-full px-3 py-2 rounded text-sm"
                        style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                        value={form.tierDiv || "4"}
                        onChange={(e) => setForm({ ...form, tierDiv: e.target.value })}>
                        {["1", "2", "3", "4"].map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="w-24">
                      <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>점수(LP)</label>
                      <input type="number" className="w-full px-3 py-2 rounded text-sm"
                        style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                        value={form.lp || ""}
                        onChange={(e) => setForm({ ...form, lp: e.target.value })}
                        placeholder="예: 500" />
                    </div>
                  )}
                </div>

                {/* 부계정 */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>부계정 1 <span style={{ color: "var(--text-dim)" }}>(선택)</span></label>
                  <input className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                    value={form.altNickname1}
                    onChange={(e) => setForm({ ...form, altNickname1: e.target.value })}
                    placeholder="부계정 닉네임" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>부계정 2 <span style={{ color: "var(--text-dim)" }}>(선택)</span></label>
                  <input className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                    value={form.altNickname2}
                    onChange={(e) => setForm({ ...form, altNickname2: e.target.value })}
                    placeholder="부계정 닉네임" />
                </div>

                {/* 포지션 */}
                <div className="col-span-2 md:col-span-3">
                  <label className="text-xs mb-2 block" style={{ color: "var(--text-muted)" }}>주력 포지션 (복수 선택 가능)</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
                        style={{
                          background: form.roles.includes(role) ? (ROLE_COLORS[role] + "33") : "var(--panel-alt)",
                          color: form.roles.includes(role) ? ROLE_COLORS[role] : "var(--text-muted)",
                          border: `1px solid ${form.roles.includes(role) ? ROLE_COLORS[role] : "var(--border)"}`,
                        }}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSubmit} className="px-5 py-2 rounded text-sm font-semibold"
                  style={{ background: "var(--accent)", color: "var(--panel-alt)" }}>
                  {editId ? "저장" : "추가"}
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-5 py-2 rounded text-sm"
                  style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 멤버 카드 목록 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.length === 0 ? (
              <div className="col-span-3 py-16 text-center rounded-lg border"
                style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
                아직 등록된 멤버가 없습니다.
              </div>
            ) : (
              players.map((p) => (
                <div key={p.id} className="p-4 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-base" style={{ color: "var(--text)" }}>{p.nickname}</div>
                      {p.realName && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{p.realName}</div>}
                    </div>
                    <span className="text-xs px-2 py-1 rounded font-bold whitespace-nowrap"
                      style={{ background: (TIER_COLORS[p.tier] || "var(--accent)") + "22", color: TIER_COLORS[p.tier] || "var(--accent)", border: `1px solid ${(TIER_COLORS[p.tier] || "var(--accent)")}44` }}>
                      {p.tier}{!["마스터", "그랜드마스터", "챌린저"].includes(p.tier) ? (p.tierDiv ? ` ${p.tierDiv}` : "") : (p.lp ? ` ${p.lp}LP` : "")}
                    </span>
                  </div>

                  {/* 부계정 */}
                  {(p.altNicknames || []).filter(Boolean).length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {(p.altNicknames || []).filter(Boolean).map((alt, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 rounded"
                          style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                          부{idx + 1} {alt}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 포지션 태그 */}
                  {(p.roles || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(p.roles || []).map((role) => (
                        <span key={role} className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ background: (ROLE_COLORS[role] || "var(--accent)") + "22", color: ROLE_COLORS[role] || "var(--accent)" }}>
                          {role}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--hover)" }}>
                    <button onClick={() => startEdit(p)} className="px-3 py-1 rounded text-xs flex-1"
                      style={{ background: "var(--hover)", color: "var(--accent)", border: "1px solid var(--border)" }}>수정</button>
                    <button onClick={() => setRenameModal({ playerId: p.id, oldNickname: p.nickname, newNickname: "" })}
                      className="px-3 py-1 rounded text-xs flex-1"
                      style={{ background: "var(--hover)", color: "#f9a825", border: "1px solid var(--border)" }}>닉네임 변경</button>
                    <button onClick={() => deletePlayer(p.id)} className="px-3 py-1 rounded text-xs"
                      style={{ background: "var(--hover)", color: "var(--loss)", border: "1px solid var(--border)" }}>삭제</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
