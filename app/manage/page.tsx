"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import GuideBanner from "@/components/GuideBanner";
import { loadNicknames, saveNicknames, loadGameRecords, saveGameRecords, normalizeId } from "@/lib/stats";
import type { NicknameEntry, SeasonDef } from "@/lib/types";
import { computePlayerStats, computeAggregatedStats, getAllNicknames } from "@/lib/stats";
import { TrophyBadge } from "@/components/TrophyBadge";

// ── 멤버 관리 타입/상수 ─────────────────────────────────────
type NicknameForm = Omit<NicknameEntry, "id" | "altNicknames"> & {
  altNickname1: string;
  altNickname2: string;
};
const TIERS = ["아이언","브론즈","실버","골드","플래티넘","에메랄드","다이아몬드","마스터","그랜드마스터","챌린저"];
const ALL_ROLES = ["탑","정글","미드","원딜","서포터"];
const TIER_COLORS: Record<string, string> = {
  아이언:"#6b6b6b", 브론즈:"#a05030", 실버:"#a0a8b0", 골드:"#c8a951", 플래티넘:"#50b090",
  에메랄드:"#40c070", 다이아몬드:"#6080c8", 마스터:"#9060c0", 그랜드마스터:"#d04040", 챌린저:"#e8c030",
};
const ROLE_COLORS: Record<string, string> = {
  탑:"#e06060", 정글:"#50a050", 미드:"#5090d0", 원딜:"#c0a030", 서포터:"#9060c0",
};
const emptyForm = (): NicknameForm => ({ nickname:"", altNickname1:"", altNickname2:"", realName:"", tier:"골드", tierDiv:"4", lp:"", roles:[] });

// ── 그룹 관리 타입 ───────────────────────────────────────────
type Role = "admin" | "editor" | "viewer";
interface Member { userId:string; email:string; name?:string|null; image?:string|null; role:Role; joinedAt:string; }
interface Group { id:string; name:string; inviteToken:string; }
const ROLE_LABELS: Record<Role, string> = { admin:"관리자", editor:"편집자", viewer:"뷰어" };
const GROUP_ROLE_COLORS: Record<Role, string> = { admin:"#4caf50", editor:"#2196f3", viewer:"#9e9e9e" };

// ── 탭 버튼 ─────────────────────────────────────────────────
type Tab = "members" | "group" | "season";

export default function ManagePage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>(session?.user?.groupId ? "members" : "group");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <GuideBanner
        pageKey="manage"
        icon="🏕️"
        title="마을 관리 페이지 사용법"
        guideAnchor="manage"
        items={[
          "멤버 관리 탭에서 내전에 참여하는 닉네임과 포지션·티어 정보를 등록·수정할 수 있어요.",
          "그룹 관리 탭에서 초대 링크를 복사해 친구들에게 공유하면 같은 그룹에서 기록을 함께 관리할 수 있습니다.",
          "그룹 멤버에게 편집자·뷰어 권한을 부여해 기록 수정 권한을 조절할 수 있어요.",
          "닉네임이 등록되지 않으면 랭킹·챔피언 분석에 이름이 표시되지 않으니 먼저 등록하세요.",
        ]}
      />
      {/* 탭 헤더 */}
      <div className="flex gap-0 mb-8 rounded-xl overflow-hidden"
        style={{ background:"var(--panel)", border:"1px solid var(--border)", display:"inline-flex" }}>
        {([
          { id:"members" as Tab, label:"👥 멤버 관리" },
          { id:"season"  as Tab, label:"🏆 시즌 관리" },
          { id:"group"   as Tab, label:"🏕️ 그룹 관리" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-6 py-3 text-sm font-bold transition-all duration-150"
            style={{
              background: tab === t.id ? "var(--accent)" : "transparent",
              color: tab === t.id ? "#fff" : "var(--text-muted)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "members" ? <MembersTab /> : tab === "season" ? <SeasonTab /> : <GroupTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// 멤버 관리 탭
// ══════════════════════════════════════════════════════════
function MembersTab() {
  const [players, setPlayers] = useState<NicknameEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<NicknameForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [renameModal, setRenameModal] = useState<{ playerId:string; oldNickname:string; newNickname:string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameResult, setRenameResult] = useState<{ count:number } | null>(null);

  useEffect(() => { loadNicknames().then(d => { setPlayers(d); setLoading(false); }); }, []);

  const save = async (data: NicknameEntry[]) => { setPlayers(data); await saveNicknames(data); };

  const handleSubmit = () => {
    if (!form.nickname.trim()) return;
    const altNicknames = [form.altNickname1.trim(), form.altNickname2.trim()].filter(Boolean);
    const entry = { nickname:form.nickname, altNicknames, realName:form.realName, tier:form.tier, tierDiv:form.tierDiv, lp:form.lp, roles:form.roles };
    if (editId) { save(players.map(p => p.id === editId ? { ...entry, id:editId } : p)); setEditId(null); }
    else { save([...players, { ...entry, id:Date.now().toString() }]); }
    setForm(emptyForm()); setShowForm(false);
  };

  const startEdit = (p: NicknameEntry) => {
    setForm({ nickname:p.nickname, altNickname1:p.altNicknames?.[0]||"", altNickname2:p.altNicknames?.[1]||"", realName:p.realName, tier:p.tier, tierDiv:p.tierDiv||"4", lp:p.lp||"", roles:p.roles||[] });
    setEditId(p.id); setShowForm(true);
  };

  const applyRename = async () => {
    if (!renameModal || !renameModal.newNickname.trim()) return;
    const { playerId, oldNickname, newNickname } = renameModal;
    const trimmedNew = newNickname.trim();
    if (normalizeId(oldNickname) === normalizeId(trimmedNew)) { setRenameModal(null); return; }
    setRenaming(true); setRenameResult(null);
    try {
      const records = await loadGameRecords();
      const normalizedOld = normalizeId(oldNickname); let count = 0;
      const updatedRecords = records.map(r => ({
        ...r,
        team1: r.team1.map(p => { if (normalizeId(p.nickname||"")=== normalizedOld){count++;return{...p,nickname:trimmedNew};} return p; }),
        team2: r.team2.map(p => { if (normalizeId(p.nickname||"")=== normalizedOld){count++;return{...p,nickname:trimmedNew};} return p; }),
      }));
      const updatedPlayers = players.map(p => p.id===playerId ? {...p,nickname:trimmedNew} : p);
      await saveGameRecords(updatedRecords); await saveNicknames(updatedPlayers);
      setPlayers(updatedPlayers); setRenameResult({ count }); setRenameModal(null);
    } catch(e){ console.error(e); } finally { setRenaming(false); }
  };

  const toggleRole = (role:string) => setForm(prev => ({ ...prev, roles: prev.roles.includes(role) ? prev.roles.filter(r=>r!==role) : [...prev.roles,role] }));

  return (
    <>
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.7)" }}
          onClick={() => !renaming && setRenameModal(null)}>
          <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ background:"var(--panel)", border:"1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1" style={{ color:"var(--text)" }}>닉네임 변경</h3>
            <p className="text-xs mb-5" style={{ color:"var(--text-muted)" }}>게임 기록 전체에서 이전 닉네임이 새 닉네임으로 교체됩니다.</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs mb-1 block" style={{ color:"var(--text-muted)" }}>현재 닉네임</label>
                <div className="px-3 py-2 rounded text-sm font-semibold" style={{ background:"var(--hover)", color:"var(--text-dim)", border:"1px solid var(--border)" }}>{renameModal.oldNickname}</div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color:"var(--text-muted)" }}>새 닉네임</label>
                <input autoFocus className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ background:"var(--panel-alt)", border:"1px solid var(--accent)", color:"var(--text)" }}
                  placeholder="변경할 닉네임 입력" value={renameModal.newNickname}
                  onChange={e => setRenameModal({...renameModal, newNickname:e.target.value})}
                  onKeyDown={e => e.key==="Enter" && applyRename()} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={applyRename} disabled={renaming||!renameModal.newNickname.trim()} className="flex-1 py-2.5 rounded-lg font-bold text-sm"
                style={{ background:renaming||!renameModal.newNickname.trim()?"var(--border)":"#f9a825", color:"#fff", cursor:renaming?"not-allowed":"pointer" }}>
                {renaming ? "변경 중..." : "변경 적용"}
              </button>
              <button onClick={() => setRenameModal(null)} disabled={renaming} className="px-5 py-2.5 rounded-lg text-sm"
                style={{ background:"var(--hover)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {renameResult && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-2xl"
          style={{ background:"#1b5e20", color:"#a5d6a7", border:"1px solid #2e7d32" }}>
          ✅ 닉네임 변경 완료 — 게임 기록 {renameResult.count}건 업데이트
          <button onClick={() => setRenameResult(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color:"var(--accent)" }}>👥 닉네임 명단</h2>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); }}
          className="px-4 py-2 rounded text-sm font-semibold" style={{ background:"var(--accent)", color:"var(--panel-alt)" }}>
          + 멤버 추가
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center" style={{ color:"var(--text-muted)" }}>
          <div className="text-3xl mb-4 animate-bounce">🤖</div>
          <p>명단 데이터를 서버에서 불러오는 중입니다...</p>
        </div>
      ) : (
        <>
          {showForm && (
            <div className="mb-6 p-5 rounded-lg border" style={{ background:"var(--panel)", borderColor:"var(--border)" }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color:"var(--accent)" }}>{editId ? "멤버 수정" : "새 멤버 추가"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color:"var(--text-muted)" }}>인게임 닉네임 (주계정)</label>
                  <input className="w-full px-3 py-2 rounded text-sm" style={{ background:"var(--panel-alt)", border:"1px solid var(--border)", color:"var(--text)" }}
                    value={form.nickname} onChange={e => setForm({...form,nickname:e.target.value})} placeholder="주계정 닉네임" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color:"var(--text-muted)" }}>실명/별명</label>
                  <input className="w-full px-3 py-2 rounded text-sm" style={{ background:"var(--panel-alt)", border:"1px solid var(--border)", color:"var(--text)" }}
                    value={form.realName} onChange={e => setForm({...form,realName:e.target.value})} placeholder="실명 또는 별명" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color:"var(--text-muted)" }}>티어</label>
                    <select className="w-full px-3 py-2 rounded text-sm" style={{ background:"var(--panel-alt)", border:"1px solid var(--border)", color:"var(--text)" }}
                      value={form.tier} onChange={e => setForm({...form,tier:e.target.value})}>
                      {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {!["마스터","그랜드마스터","챌린저"].includes(form.tier) ? (
                    <div className="w-20">
                      <label className="text-xs mb-1 block" style={{ color:"var(--text-muted)" }}>단계</label>
                      <select className="w-full px-3 py-2 rounded text-sm" style={{ background:"var(--panel-alt)", border:"1px solid var(--border)", color:"var(--text)" }}
                        value={form.tierDiv||"4"} onChange={e => setForm({...form,tierDiv:e.target.value})}>
                        {["1","2","3","4"].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="w-24">
                      <label className="text-xs mb-1 block" style={{ color:"var(--text-muted)" }}>점수(LP)</label>
                      <input type="number" className="w-full px-3 py-2 rounded text-sm" style={{ background:"var(--panel-alt)", border:"1px solid var(--border)", color:"var(--text)" }}
                        value={form.lp||""} onChange={e => setForm({...form,lp:e.target.value})} placeholder="예: 500" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color:"var(--text-muted)" }}>부계정 1 <span style={{ color:"var(--text-dim)" }}>(선택)</span></label>
                  <input className="w-full px-3 py-2 rounded text-sm" style={{ background:"var(--panel-alt)", border:"1px solid var(--border)", color:"var(--text)" }}
                    value={form.altNickname1} onChange={e => setForm({...form,altNickname1:e.target.value})} placeholder="부계정 닉네임" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color:"var(--text-muted)" }}>부계정 2 <span style={{ color:"var(--text-dim)" }}>(선택)</span></label>
                  <input className="w-full px-3 py-2 rounded text-sm" style={{ background:"var(--panel-alt)", border:"1px solid var(--border)", color:"var(--text)" }}
                    value={form.altNickname2} onChange={e => setForm({...form,altNickname2:e.target.value})} placeholder="부계정 닉네임" />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="text-xs mb-2 block" style={{ color:"var(--text-muted)" }}>주력 포지션 (복수 선택 가능)</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map(role => (
                      <button key={role} type="button" onClick={() => toggleRole(role)} className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
                        style={{ background:form.roles.includes(role)?(ROLE_COLORS[role]+"33"):"var(--panel-alt)", color:form.roles.includes(role)?ROLE_COLORS[role]:"var(--text-muted)", border:`1px solid ${form.roles.includes(role)?ROLE_COLORS[role]:"var(--border)"}` }}>
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSubmit} className="px-5 py-2 rounded text-sm font-semibold" style={{ background:"var(--accent)", color:"var(--panel-alt)" }}>
                  {editId ? "저장" : "추가"}
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-5 py-2 rounded text-sm" style={{ background:"var(--hover)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>취소</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.length === 0 ? (
              <div className="col-span-3 py-16 text-center rounded-lg border" style={{ background:"var(--panel)", borderColor:"var(--border)", color:"var(--text-muted)" }}>
                아직 등록된 멤버가 없습니다.
              </div>
            ) : players.map(p => (
              <div key={p.id} className="p-4 rounded-lg border" style={{ background:"var(--panel)", borderColor:"var(--border)" }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-base" style={{ color:"var(--text)" }}>{p.nickname}</div>
                    {p.realName && <div className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>{p.realName}</div>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded font-bold whitespace-nowrap"
                    style={{ background:(TIER_COLORS[p.tier]||"var(--accent)")+"22", color:TIER_COLORS[p.tier]||"var(--accent)", border:`1px solid ${(TIER_COLORS[p.tier]||"var(--accent)")}44` }}>
                    {p.tier}{!["마스터","그랜드마스터","챌린저"].includes(p.tier)?(p.tierDiv?` ${p.tierDiv}`:""):(p.lp?` ${p.lp}LP`:"")}
                  </span>
                </div>
                {(p.altNicknames||[]).filter(Boolean).length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {(p.altNicknames||[]).filter(Boolean).map((alt,idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded" style={{ background:"var(--hover)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>부{idx+1} {alt}</span>
                    ))}
                  </div>
                )}
                {(p.roles||[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(p.roles||[]).map(role => (
                      <span key={role} className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background:(ROLE_COLORS[role]||"var(--accent)")+"22", color:ROLE_COLORS[role]||"var(--accent)" }}>{role}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop:"1px solid var(--hover)" }}>
                  <button onClick={() => startEdit(p)} className="px-3 py-1 rounded text-xs flex-1" style={{ background:"var(--hover)", color:"var(--accent)", border:"1px solid var(--border)" }}>수정</button>
                  <button onClick={() => setRenameModal({ playerId:p.id, oldNickname:p.nickname, newNickname:"" })} className="px-3 py-1 rounded text-xs flex-1" style={{ background:"var(--hover)", color:"#f9a825", border:"1px solid var(--border)" }}>닉네임 변경</button>
                  <button onClick={() => save(players.filter(pl => pl.id!==p.id))} className="px-3 py-1 rounded text-xs" style={{ background:"var(--hover)", color:"var(--loss)", border:"1px solid var(--border)" }}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════
// 퀴즈 상수
// ══════════════════════════════════════════════════════════
type ThemeId = "leaf" | "rain" | "aka" | "sand" | "cloud";

const QUESTIONS = [
  {
    q: "팀을 이끌 때 선호하는 내 리더십 스타일은?",
    opts: [
      { label: "🌱 팀원 개개인의 의견을 경청하며 화합을 이끄는 서포터형 리더", theme: "leaf" as ThemeId },
      { label: "📝 객관적인 데이터와 지표를 바탕으로 오더를 내리는 전략가형 리더", theme: "rain" as ThemeId },
      { label: "🎯 확실한 피드백과 명확한 방향 제시로 결과를 내는 주도형 리더", theme: "aka"  as ThemeId },
      { label: "⚓ 어려운 상황에서도 흔들리지 않고 중심을 지키는 끈기형 리더", theme: "sand" as ThemeId },
      { label: "🚀 빠른 템포의 결단력과 강한 에너지로 돌파구를 여는 저돌형 리더", theme: "cloud" as ThemeId },
    ],
  },
  {
    q: "우리 내전 팀이 궁극적으로 도달하고 싶은 가치는?",
    opts: [
      { label: "🎈 승패와 상관없이 서로 웃으며 즐겁게 소통할 수 있는 융화", theme: "leaf" as ThemeId },
      { label: "🔍 매 경기 분석을 통해 피드백하며 실력을 높여가는 체계성", theme: "rain" as ThemeId },
      { label: "🏆 모두가 감탄할 수 있는 압도적인 한타나 실력의 시원한 증명", theme: "aka"  as ThemeId },
      { label: "🧱 불리한 게임도 끝까지 포기하지 않고 버티는 끈기 있는 플레이", theme: "sand" as ThemeId },
      { label: "🤝 팀원 간의 끈끈한 의리와 신뢰로 맞춰가는 완벽한 팀워크", theme: "cloud" as ThemeId },
    ],
  },
  {
    q: "인게임에서 킬/데스 차이가 벌어지며 밀릴 때 팀의 대처는?",
    opts: [
      { label: "📣 파이팅을 크게 외치며 서로를 다독이고 멘탈을 케어해준다.", theme: "leaf" as ThemeId },
      { label: "💭 침착하게 전략을 수정하고 다음 한타를 위해 성장에 집중한다.", theme: "rain" as ThemeId },
      { label: "⚔️ 쫄지 않고 더 공격적으로 상대 빈틈을 찔러 변수를 만들어낸다.", theme: "aka"  as ThemeId },
      { label: "🛡️ 타워를 끼고 든든하게 수비하며 후반 반격 타이밍을 기다린다.", theme: "sand" as ThemeId },
      { label: "💨 기죽지 않고 파이팅 넘치게 빠른 이니시로 흐름을 돌려본다.", theme: "cloud" as ThemeId },
    ],
  },
  {
    q: "게임을 마친 후 피드백을 주고받는 가장 바람직한 태도는?",
    opts: [
      { label: "🌸 칭찬과 부드러운 격려를 통해 서로 기분 좋게 다음을 약속한다.", theme: "leaf" as ThemeId },
      { label: "💻 리플레이와 지표 등을 캡처하여 팩트 위주로 조용히 문제점을 짚는다.", theme: "rain" as ThemeId },
      { label: "📢 개선할 점을 솔직하고 직설적으로 나누어 확실하게 오답 노트를 적는다.", theme: "aka"  as ThemeId },
      { label: "🧘 이번 세트의 실패에 연연하지 않고 다음 세트 멘탈에 집중한다.", theme: "sand" as ThemeId },
      { label: "😆 친한 친구끼리 말하듯 털털하고 유쾌하게 툭 터놓고 털어버린다.", theme: "cloud" as ThemeId },
    ],
  },
  {
    q: "팀 편성 후 밴픽을 준비할 때 선호하는 팀 시너지는?",
    opts: [
      { label: "🌟 팀원들이 가장 선호하고 숙련도 높은 챔피언을 살려주는 밴픽", theme: "leaf" as ThemeId },
      { label: "🎯 상대 플레이어들의 모스트 챔피언을 사전에 차단하는 분석 밴픽", theme: "rain" as ThemeId },
      { label: "🔥 라인전 주도권을 확실하게 쥐어 상대를 강하게 압박하는 밴픽", theme: "aka"  as ThemeId },
      { label: "💎 받아치기 좋고 한타 밸류가 높아 후반을 도모할 수 있는 단단한 밴픽", theme: "sand" as ThemeId },
      { label: "🏃 기동성이 빠르고 순간적인 합류로 주도권을 잡는 돌진형 밴픽", theme: "cloud" as ThemeId },
    ],
  },
];

const THEME_INFO: Record<ThemeId, { icon: string; name: string; color: string; desc: string; flavor: string; storageKey: string }> = {
  leaf: {
    icon: "🍃", name: "나뭇잎 마을", color: "#2A5C1E", storageKey: "leaf",
    desc: "함께 성장하는 팀",
    flavor: "꾸준함과 팀워크를 중시하는 나뭇잎 마을 스타일이야.\n모두가 함께 기록하고 발전하는 내전 문화를 만들어가자. 화의 의지, 함께라면 어디든 갈 수 있어!",
  },
  rain: {
    icon: "🌧️", name: "비 마을", color: "#9d92d4", storageKey: "rain",
    desc: "냉정한 전략가들의 집결지",
    flavor: "데이터와 분석으로 승리를 설계하는 비 마을 스타일이야.\n기록은 곧 무기가 된다. 감정보다 전략, 직감보다 계산으로 압도해.",
  },
  aka: {
    icon: "🌕", name: "아카츠키", color: "#c93b3b", storageKey: "aka",
    desc: "승리에 집착하는 최강 집단",
    flavor: "압도적인 실력과 승리에 집착하는 아카츠키 스타일이야.\n약함은 용납되지 않는다. 오직 전진, 오직 승리만이 존재해.",
  },
  sand: {
    icon: "🏜️", name: "모래 마을", color: "#b28030", storageKey: "sand",
    desc: "인내와 생존의 모래바람",
    flavor: "황량한 사막에서도 끈질기게 생존하는 모래 마을 스타일이야.\n어려운 환경에서도 흔들리지 않는 끈기와 독함으로, 최후의 승리를 쟁취해 봐. 모래 폭풍이 몰아쳐도 꺾이지 않는다!",
  },
  cloud: {
    icon: "⚡", name: "구름 마을", color: "#2563eb", storageKey: "cloud",
    desc: "신뢰와 신속한 단결력",
    flavor: "강인한 유대와 신속한 돌파력을 중시하는 구름 마을 스타일이야.\n동료에 대한 굳건한 신뢰와 화끈한 파이팅으로 매서운 속도의 진격을 보여줘. 번개의 기상으로 적을 돌파하자!",
  },
};

// ══════════════════════════════════════════════════════════
// 그룹 관리 탭
// ══════════════════════════════════════════════════════════
function GroupTab() {
  const { data: session } = useSession();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  // 퀴즈 상태
  const [phase, setPhase] = useState<"quiz" | "result" | "create">("quiz");
  const [showQuizOverride, setShowQuizOverride] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [votes, setVotes] = useState<Record<ThemeId, number>>({ leaf: 0, rain: 0, aka: 0, sand: 0, cloud: 0 });
  const [selected, setSelected] = useState<ThemeId | null>(null);
  const [resultTheme, setResultTheme] = useState<ThemeId>("leaf");
  const [revealed, setRevealed] = useState(false);

  const fetchGroup = useCallback(async () => {
    const [g, m] = await Promise.all([
      fetch("/api/group").then(r => r.json()),
      fetch("/api/group/members").then(r => r.json()),
    ]);
    setGroup(g.group); setMembers(m.members ?? []); setLoading(false);
  }, []);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  // 이전에 퀴즈를 완료했는지 체크하여 완료했다면 그룹 생성 단계로 바로 진입
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDone = localStorage.getItem("themeQuizDone") === "true";
      if (isDone) {
        setPhase("create");
        const savedTheme = localStorage.getItem("theme") as ThemeId;
        if (savedTheme && ["leaf", "rain", "aka", "sand", "cloud"].includes(savedTheme)) {
          setResultTheme(savedTheme);
        }
      }
    }
  }, []);

  const [consecutiveCount, setConsecutiveCount] = useState(0);
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleResetQuiz = () => {
    try {
      localStorage.removeItem("themeQuizDone");
    } catch {}
    setPhase("quiz");
    setCurrentQ(0);
    setVotes({ leaf: 0, rain: 0, aka: 0, sand: 0, cloud: 0 });
    setSelected(null);
    setSelectedIdx(null);
    setRevealed(false);
    setShowQuizOverride(true);
    setConsecutiveCount(0);
    setLastSelectedIdx(null);
  };

  const inviteUrl = group && typeof window !== "undefined"
    ? `${window.location.origin}/invite/${group.inviteToken}` : "";

  function handleSelectOption(theme: ThemeId, idx: number) {
    setSelected(theme);
    setSelectedIdx(idx);
  }

  function handleNextQuestion() {
    if (!selected || selectedIdx === null) return;

    // Check consecutive option selection
    let nextCount = 1;
    if (lastSelectedIdx === selectedIdx) {
      nextCount = consecutiveCount + 1;
    }
    setConsecutiveCount(nextCount);
    setLastSelectedIdx(selectedIdx);

    if (nextCount >= 5) {
      if (typeof window !== "undefined") {
        const suffix = session?.user?.id ? `_${session.user.id}` : "_guest";
        localStorage.setItem(`theme_unlocked_orochimaru${suffix}`, "true");
        localStorage.setItem("theme", "orochimaru");
        window.dispatchEvent(new CustomEvent("theme_unlocked"));
        window.dispatchEvent(new CustomEvent("themechange", { detail: "orochimaru" }));
        window.dispatchEvent(new CustomEvent("show_unlock_modal", {
          detail: {
            id: "orochimaru",
            name: "오로치마루의 비밀 실험실",
            icon: "🧪",
            color: "#10b981",
            desc: "금단의 술법을 연구하고 생명을 창조하는 어둠의 연구실",
            flavor: "마을 관리 성향 퀴즈에서 하나의 신념(번호)을 집요하게 관철하여(동일 번호 5회 연속 선택) 금단의 실험실을 해금했습니다.\n배양액 실린더에서 보글보글 솟구쳐오르는 비눗방울 입자들과 좌우의 하얀 뱀과 실험 장치가 차갑고도 기괴한 분위기를 연출합니다."
          }
        }));
      }
    }

    const newVotes = { ...votes, [selected]: votes[selected] + 1 };
    setVotes(newVotes);
    setSelected(null);
    setSelectedIdx(null);

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      // 결과 계산
      const winner = (Object.keys(newVotes) as ThemeId[]).reduce((a, b) => newVotes[a] >= newVotes[b] ? a : b);
      setResultTheme(winner);
      setPhase("result");
      setTimeout(() => setRevealed(true), 100);
      // 테마 즉시 적용
      try {
        localStorage.setItem("theme", THEME_INFO[winner].storageKey);
        localStorage.setItem("themeQuizDone", "true");
        window.dispatchEvent(new CustomEvent("themechange", { detail: winner }));
      } catch {}
    }
  }

  function handleGoToCreate() {
    setPhase("create");
    setRevealed(false);
  }

  async function handleCreateGroup() {
    setCreating(true); setError("");
    // 레거시 데이터 복구 먼저 시도, 없으면 일반 생성
    let res = await fetch("/api/group/restore", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ name: groupName }) });
    if (!res.ok && res.status === 404) {
      res = await fetch("/api/group", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ name: groupName }) });
    }
    const data = await res.json();
    if (!res.ok) { setError(data.error); setCreating(false); return; }
    await fetchGroup(); setCreating(false);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerateToken() {
    if (!confirm("초대 링크를 재생성하면 기존 링크는 사용할 수 없습니다. 계속할까요?")) return;
    setRegenerating(true);
    const res = await fetch("/api/group/invite", { method:"PUT" });
    if (res.ok) await fetchGroup();
    setRegenerating(false);
  }

  async function handleRoleChange(userId:string, role:Role) {
    await fetch("/api/group/members", { method:"PATCH", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ userId, role }) });
    await fetchGroup();
  }

  async function handleRemoveMember(userId:string, name:string|null|undefined) {
    if (!confirm(`${name??userId}님을 그룹에서 제거할까요?`)) return;
    await fetch("/api/group/members", { method:"DELETE", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ userId }) });
    await fetchGroup();
  }

  async function handleDisbandGroup() {
    if (!confirm("그룹을 해체하면 모든 기록과 멤버 데이터가 영구 삭제됩니다.\n정말 해체할까요?")) return;
    const res = await fetch("/api/group", { method:"DELETE" });
    if (res.ok) await fetchGroup();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div style={{ color:"var(--text-dim)" }}>로딩 중...</div></div>;

  // ── 그룹 없음 또는 퀴즈 강제 진입: 퀴즈 플로우 ──────────────────────────────
  if (!group || showQuizOverride) {
    const info = THEME_INFO[resultTheme];

    // 결과 화면
    if (phase === "result") return (
      <div className="max-w-md mx-auto py-8 text-center"
        style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>
        <div className="text-7xl mb-4" style={{ filter: resultTheme === "aka" ? "sepia(1) saturate(8) hue-rotate(310deg) brightness(0.85)" : undefined }}>
          {info.icon}
        </div>
        <div className="text-xs font-bold tracking-widest mb-1" style={{ color: info.color, opacity: 0.7 }}>YOUR THEME</div>
        <h2 className="text-3xl font-black mb-1" style={{ color: info.color }}>{info.name}</h2>
        <p className="text-sm font-bold mb-4" style={{ color: "var(--text-muted)" }}>{info.desc}</p>
        <div className="rounded-2xl p-5 mb-8 text-left"
          style={{ background: info.color + "18", border: `1px solid ${info.color}44` }}>
          {info.flavor.split("\n").map((line, i) => (
            <p key={i} className={`text-sm ${i > 0 ? "mt-2" : ""}`} style={{ color: "var(--text-muted)" }}>{line}</p>
          ))}
        </div>
        {group ? (
          <div className="flex flex-col gap-2">
            <button onClick={() => setShowQuizOverride(false)}
              className="w-full py-3.5 rounded-xl font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: info.color, boxShadow: `0 4px 20px ${info.color}55` }}>
              테마 적용하고 완료하기 ✓
            </button>
            <button onClick={() => setShowQuizOverride(false)} className="w-full py-2 text-xs" style={{ color:"var(--text-dim)" }}>
              테마 적용 없이 돌아가기
            </button>
          </div>
        ) : (
          <button onClick={handleGoToCreate}
            className="w-full py-3.5 rounded-xl font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: info.color, boxShadow: `0 4px 20px ${info.color}55` }}>
            이 테마로 그룹 만들기 →
          </button>
        )}
      </div>
    );

    // 그룹 이름 입력 화면
    if (phase === "create") {
      const ci = THEME_INFO[resultTheme];
      return (
        <div className="max-w-md mx-auto py-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">{ci.icon}</span>
            <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: ci.color + "22", color: ci.color }}>
              {ci.name} 테마 적용됨
            </span>
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: "var(--accent)" }}>그룹 이름 정하기</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>친구들에게 보여질 그룹 이름을 입력해줘</p>
          <div className="rounded-2xl p-6 mb-4" style={{ background:"var(--panel)", border:"1px solid var(--border)" }}>
            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} maxLength={30}
              autoFocus placeholder="예: 나뭇잎 마을, 우리들의 내전..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background:"var(--hover)", border:`1px solid ${ci.color}66`, color:"var(--text)" }} />
          </div>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button onClick={handleCreateGroup} disabled={creating || !groupName.trim()}
            className="w-full py-3.5 rounded-xl font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: ci.color, boxShadow: `0 4px 16px ${ci.color}44` }}>
            {creating ? "생성 중..." : "그룹 만들기 🎉"}
          </button>
          <button onClick={() => setPhase("result")} className="w-full mt-2 py-2 text-xs" style={{ color:"var(--text-dim)" }}>
            ← 결과 다시 보기
          </button>
          <button onClick={handleResetQuiz} className="w-full mt-1 py-1 text-xs opacity-60 hover:opacity-100 transition-opacity" style={{ color:"var(--text-dim)" }}>
            🔄 테마 퀴즈 다시 풀기
          </button>
        </div>
      );
    }

    // 퀴즈 화면
    const q = QUESTIONS[currentQ];
    return (
      <div className="max-w-lg mx-auto py-8">
        {/* 진행 표시 */}
        <div className="flex items-center gap-2 mb-8">
          {QUESTIONS.map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= currentQ ? "var(--accent)" : "var(--border)" }} />
          ))}
          <span className="text-xs ml-1 tabular-nums" style={{ color:"var(--text-dim)" }}>{currentQ + 1}/{QUESTIONS.length}</span>
        </div>

        {/* 질문 카드 */}
        <div className="rounded-2xl p-6 mb-6" style={{ background:"var(--panel)", border:"1px solid var(--border)" }}>
          <p className="text-lg font-black mb-6" style={{ color:"var(--text)" }}>{q.q}</p>
          <div className="flex flex-col gap-3">
            {q.opts.map((opt, idx) => (
              <button key={opt.theme} onClick={() => handleSelectOption(opt.theme, idx)}
                className="w-full px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-all duration-150 hover:scale-[1.01]"
                style={{
                  background: selected === opt.theme ? "var(--accent)" : "var(--hover)",
                  color: selected === opt.theme ? "#fff" : "var(--text-muted)",
                  border: selected === opt.theme ? "1px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: selected === opt.theme ? "0 4px 12px rgba(76,175,80,0.3)" : "none",
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleNextQuestion} disabled={!selected}
          className="w-full py-3.5 rounded-xl font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30"
          style={{ background:"var(--accent)" }}>
          {currentQ < QUESTIONS.length - 1 ? "다음 →" : "결과 보기 ✨"}
        </button>
      </div>
    );
  }

  const isAdmin = members.some(m => m.userId === session?.user?.id && m.role === "admin");

  return (
    <div>
      <h2 className="text-2xl font-black mb-1" style={{ color:"var(--accent)" }}>{group.name}</h2>
      <p className="text-sm mb-6 flex flex-wrap items-center gap-x-4 gap-y-2" style={{ color:"var(--text-dim)" }}>
        <span>
          내 역할: <span className="font-bold" style={{ color:GROUP_ROLE_COLORS[session?.user?.role ?? "viewer"] }}>
            {ROLE_LABELS[session?.user?.role ?? "viewer"]}
          </span>
        </span>
        <button onClick={handleResetQuiz} className="text-xs px-2.5 py-1 rounded border transition-all hover:bg-white/5" style={{ borderColor:"var(--border)", color:"var(--text-dim)" }}>
          🔄 테마 퀴즈 다시 풀기
        </button>
      </p>

      <section className="rounded-2xl p-5 mb-6" style={{ background:"var(--panel)", border:"1px solid var(--border)" }}>
        <h3 className="font-bold text-sm mb-3" style={{ color:"var(--text-muted)" }}>초대 링크</h3>
        <div className="flex gap-2">
          <input readOnly value={inviteUrl} className="flex-1 px-3 py-2 rounded-xl text-xs truncate outline-none"
            style={{ background:"var(--hover)", border:"1px solid var(--border)", color:"var(--text-dim)" }} />
          <button onClick={handleCopyLink} className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{ background:copied?"#4caf50":"var(--accent)", color:"#fff" }}>
            {copied ? "복사됨!" : "복사"}
          </button>
        </div>
        {isAdmin && (
          <button onClick={handleRegenerateToken} disabled={regenerating} className="mt-2 text-xs underline opacity-60 hover:opacity-100 transition-opacity" style={{ color:"var(--text-dim)" }}>
            {regenerating ? "재생성 중..." : "링크 재생성"}
          </button>
        )}
      </section>

      <section className="rounded-2xl overflow-hidden" style={{ background:"var(--panel)", border:"1px solid var(--border)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor:"var(--border)" }}>
          <h3 className="font-bold text-sm" style={{ color:"var(--text-muted)" }}>멤버 ({members.length}명)</h3>
        </div>
        <ul>
          {members.map((m, i) => (
            <li key={m.userId} className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom:i<members.length-1?"1px solid var(--border)":"none" }}>
              {m.image ? <img src={m.image} alt="" className="w-8 h-8 rounded-full" /> : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background:"var(--hover)", color:"var(--accent)" }}>
                  {(m.name??m.email)[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color:"var(--text)" }}>{m.name??m.email}</div>
                <div className="text-xs truncate" style={{ color:"var(--text-dim)" }}>{m.email}</div>
              </div>
              {isAdmin && m.userId !== session?.user?.id ? (
                <div className="flex items-center gap-2">
                  <select value={m.role} onChange={e => handleRoleChange(m.userId, e.target.value as Role)}
                    className="text-xs px-2 py-1 rounded-lg outline-none"
                    style={{ background:"var(--hover)", border:"1px solid var(--border)", color:GROUP_ROLE_COLORS[m.role] }}>
                    <option value="admin">관리자</option>
                    <option value="editor">편집자</option>
                    <option value="viewer">뷰어</option>
                  </select>
                  <button onClick={() => handleRemoveMember(m.userId, m.name)} className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-red-500/20" style={{ color:"#ef4444" }}>✕</button>
                </div>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:GROUP_ROLE_COLORS[m.role]+"22", color:GROUP_ROLE_COLORS[m.role] }}>
                  {ROLE_LABELS[m.role]}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <div className="mt-8 pt-6 border-t" style={{ borderColor:"var(--border)" }}>
          <button onClick={handleDisbandGroup}
            className="text-xs underline opacity-50 hover:opacity-100 transition-opacity"
            style={{ color:"#ef4444" }}>
            그룹 해체
          </button>
          <p className="text-xs mt-1" style={{ color:"var(--text-dim)" }}>
            해체 시 모든 기록과 멤버 데이터가 영구 삭제됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// 시즌 관리 탭
// ══════════════════════════════════════════════════════════

const RANK_COLOR: Record<1 | 2 | 3, string> = { 1: "#b45309", 2: "#475569", 3: "#9a3412" };
const RANK_ICON:  Record<1 | 2 | 3, string> = { 1: "🏆",      2: "🥈",      3: "🥉" };

function SeasonTab() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [seasons, setSeasons] = useState<SeasonDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");

  // 새 시즌 생성 폼
  const [showForm, setShowForm]     = useState(false);
  const [formLabel, setFormLabel]   = useState("");
  const [formStart, setFormStart]   = useState(new Date().toISOString().slice(0, 10));

  // 트로피 수여 모달
  type StandingRow = { nickname: string; displayName: string; score: number; wins: number; losses: number; totalGames: number };
  const [awardModal, setAwardModal] = useState<{ season: SeasonDef; standings: StandingRow[] } | null>(null);
  const [picked, setPicked] = useState<{ rank1: string; rank2: string; rank3: string }>({ rank1: "", rank2: "", rank3: "" });

  const today = new Date().toISOString().slice(0, 10);

  const fetchSeasons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seasons");
      if (res.ok) setSeasons(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSeasons(); }, [fetchSeasons]);

  // ── 새 시즌 생성 ────────────────────────────────────────
  const handleCreate = async () => {
    if (!formLabel.trim()) { setMsg("시즌 이름을 입력하세요."); return; }
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          label: formLabel.trim(),
          startDate: formStart,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? "오류"); return; }
      setShowForm(false); setFormLabel(""); setFormStart(today);
      await fetchSeasons();
      setMsg(`${formLabel.trim()} 시즌이 시작되었습니다.`);
    } finally {
      setSaving(false);
    }
  };

  // ── 트로피 수여 모달 열기 ────────────────────────────────
  const openAwardModal = async (season: SeasonDef) => {
    const [records, nicknames] = await Promise.all([loadGameRecords(), loadNicknames()]);
    const endFilter = season.endDate ?? today;
    const seasonRecords = records.filter(r => r.date >= season.startDate && r.date <= endFilter);
    const allNicks = getAllNicknames(nicknames);
    const standings: StandingRow[] = allNicks
      .map(nick => {
        const entry = nicknames.find(e => e.nickname === nick);
        const displayName = entry?.realName?.trim() || nick;
        const stats = computePlayerStats(nick, seasonRecords, nicknames);
        return { nickname: nick, displayName, score: stats.wins * 3 - stats.losses, wins: stats.wins, losses: stats.losses, totalGames: stats.totalGames };
      })
      .filter(p => p.totalGames > 0)
      .sort((a, b) => b.score - a.score || b.wins - a.wins);

    setAwardModal({ season, standings });
    setPicked({ rank1: standings[0]?.nickname ?? "", rank2: standings[1]?.nickname ?? "", rank3: standings[2]?.nickname ?? "" });
  };

  // ── 트로피 수여 확정 ──────────────────────────────────────
  const handleAward = async () => {
    if (!awardModal) return;
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/seasons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: awardModal.season.id,
          winners:  picked,
          endDate:  awardModal.season.endDate ?? today, // 종료일 미설정이면 오늘로 확정
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? "오류"); return; }
      setAwardModal(null);
      await fetchSeasons();
      setMsg("트로피가 수여되었습니다! 🏆");
    } finally {
      setSaving(false);
    }
  };

  // ── 시즌 삭제 ────────────────────────────────────────────
  const handleDelete = async (seasonId: string) => {
    if (!confirm("이 시즌과 수여된 트로피를 모두 삭제하시겠습니까?")) return;
    setSaving(true);
    try {
      await fetch("/api/seasons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId }) });
      await fetchSeasons();
      setMsg("시즌이 삭제되었습니다.");
    } finally {
      setSaving(false);
    }
  };

  const isOngoing  = (s: SeasonDef) => !s.closed && (!s.endDate || s.endDate >= today);
  const statusLabel = (s: SeasonDef) => s.closed ? "종료" : isOngoing(s) ? "진행중" : "종료 대기";
  const statusStyle = (s: SeasonDef) => s.closed
    ? { bg: "rgba(100,116,139,0.15)", color: "#64748b", border: "#94a3b8" }
    : isOngoing(s)
    ? { bg: "rgba(34,197,94,0.15)",   color: "#15803d", border: "#4ade80" }
    : { bg: "rgba(251,191,36,0.15)",  color: "#b45309", border: "#fbbf24" };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "var(--panel)", border: "1px solid var(--accent)", color: "var(--accent)" }}>
          {msg}
        </div>
      )}

      {/* ── 새 시즌 만들기 ── */}
      {isAdmin && (
        <div className="rounded-xl p-5" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:brightness-90"
              style={{ background: "var(--accent)", color: "#fff" }}>
              + 새 시즌 시작
            </button>
          ) : (
            <div className="space-y-3">
              <h3 className="font-bold text-sm" style={{ color: "var(--text-muted)" }}>📅 새 시즌 만들기</h3>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>시즌 이름</label>
                <input value={formLabel} onChange={e => setFormLabel(e.target.value)}
                  placeholder="예: 시즌 1, 여름 리그, 2026 오프시즌…"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}/>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>시작일</label>
                <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}/>
              </div>
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                종료일은 시즌을 마칠 때 "트로피 수여" 버튼으로 설정합니다.
              </p>
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-bold hover:brightness-90"
                  style={{ background: "var(--accent)", color: "#fff", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "저장 중…" : "시즌 시작"}
                </button>
                <button onClick={() => { setShowForm(false); setFormLabel(""); }}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 시즌 목록 ── */}
      {loading ? (
        <div className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>불러오는 중…</div>
      ) : seasons.length === 0 ? (
        <div className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>
          등록된 시즌이 없습니다. 위에서 새 시즌을 시작해보세요.
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.map(season => {
            const ss = statusStyle(season);
            return (
              <div key={season.id} className="rounded-xl p-5"
                style={{ background: "var(--panel)", border: `1px solid ${season.closed ? "var(--border)" : "var(--accent)"}` }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-base" style={{ color: "var(--text)" }}>{season.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                        {statusLabel(season)}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {season.startDate} ~ {season.endDate ?? "진행중"}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2 flex-wrap">
                      {!season.closed && (
                        <button onClick={() => openAwardModal(season)} disabled={saving}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-90"
                          style={{ background: "#fbbf24", color: "#78350f" }}>
                          🏆 시즌 종료 & 트로피 수여
                        </button>
                      )}
                      {season.closed && (
                        <button onClick={() => openAwardModal(season)} disabled={saving}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-90"
                          style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                          ✏️ 트로피 수정
                        </button>
                      )}
                      <button onClick={() => handleDelete(season.id)} disabled={saving}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-90"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                {season.closed && season.winners && (
                  <div className="mt-3 pt-3 flex flex-wrap gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                    {([1, 2, 3] as const).map(rank => {
                      const nick = season.winners?.[`rank${rank}` as "rank1"|"rank2"|"rank3"];
                      if (!nick) return null;
                      return (
                        <div key={rank} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: RANK_COLOR[rank] }}>
                          <TrophyBadge trophy={{ season: season.id, seasonLabel: season.label, rank }} />
                          <span>{nick}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 트로피 수여 모달 ── */}
      {awardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setAwardModal(null); }}>
          <div className="rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>🏆 시즌 종료 & 트로피 수여</h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                {awardModal.season.label} · {awardModal.season.startDate} ~ {awardModal.season.endDate ?? today}
              </p>

              <div className="mb-5 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div className="px-4 py-2 text-xs font-bold" style={{ background: "var(--panel)", color: "var(--text-muted)" }}>
                  시즌 기간 성적
                </div>
                {awardModal.standings.length === 0 ? (
                  <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>해당 기간 기록 없음</div>
                ) : awardModal.standings.slice(0, 10).map((p, i) => (
                  <div key={p.nickname} className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)", background: i < 3 ? "var(--panel)" : undefined }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold w-5" style={{ color: i < 3 ? RANK_COLOR[(i+1) as 1|2|3] : "var(--text-muted)" }}>
                        {i < 3 ? RANK_ICON[(i+1) as 1|2|3] : `${i+1}.`}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{p.displayName}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                      {p.wins}승 {p.losses}패 · {p.score}점
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6">
                {([1, 2, 3] as const).map(rank => (
                  <div key={rank}>
                    <label className="block text-xs font-bold mb-1" style={{ color: RANK_COLOR[rank] }}>
                      {RANK_ICON[rank]} {rank}위
                    </label>
                    <select value={picked[`rank${rank}` as "rank1"|"rank2"|"rank3"]}
                      onChange={e => setPicked(p => ({ ...p, [`rank${rank}`]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}>
                      <option value="">— 미수여 —</option>
                      {awardModal.standings.map(p => (
                        <option key={p.nickname} value={p.nickname}>{p.displayName} ({p.wins}승 {p.losses}패)</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={handleAward} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm hover:brightness-90"
                  style={{ background: "var(--accent)", color: "#fff", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "저장 중…" : "🏆 확정"}
                </button>
                <button onClick={() => setAwardModal(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm"
                  style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
