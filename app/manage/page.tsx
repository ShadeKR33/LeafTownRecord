"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import GuideBanner from "@/components/GuideBanner";
import { loadNicknames, saveNicknames, loadGameRecords, saveGameRecords, normalizeId } from "@/lib/stats";
import type { NicknameEntry } from "@/lib/types";

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
type Tab = "members" | "group";

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

      {tab === "members" ? <MembersTab /> : <GroupTab />}
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
type ThemeId = "leaf" | "rain" | "aka";

const QUESTIONS = [
  {
    q: "어떤 리더로 팀을 이끌고 싶어?",
    opts: [
      { label: "🤝 모두가 함께 성장하는 팀워크 중심", theme: "leaf" as ThemeId },
      { label: "🧠 데이터와 전략으로 승리를 설계하는 팀", theme: "rain" as ThemeId },
      { label: "⚡ 압도적인 실력으로 상대를 제압하는 팀", theme: "aka"  as ThemeId },
    ],
  },
  {
    q: "내전은 보통 얼마나 자주 해?",
    opts: [
      { label: "📅 주 1회 이상, 꾸준히 정기적으로", theme: "leaf" as ThemeId },
      { label: "🎯 시간 잡고 계획적으로, 제대로 할 때만", theme: "rain" as ThemeId },
      { label: "🔥 생각날 때 바로, 즉흥적으로",            theme: "aka"  as ThemeId },
    ],
  },
  {
    q: "팀이 지고 있을 때 우리 분위기는?",
    opts: [
      { label: "💪 파이팅! 다 같이 힘내서 역전 노려보자", theme: "leaf" as ThemeId },
      { label: "🧊 조용히 전략 수정, 냉정하게 플레이",    theme: "rain" as ThemeId },
      { label: "💥 뭐가 됐든 더 공격적으로, 판 뒤집자",  theme: "aka"  as ThemeId },
    ],
  },
  {
    q: "내전에서 가장 중요한 게 뭐야?",
    opts: [
      { label: "😄 웃으면서 즐기는 것, 분위기가 최고야",  theme: "leaf" as ThemeId },
      { label: "📊 꼼꼼한 기록과 데이터로 실력 향상",     theme: "rain" as ThemeId },
      { label: "🏆 무조건 이기는 것, 지는 건 의미없어",   theme: "aka"  as ThemeId },
    ],
  },
  {
    q: "팀 편성할 때 내 기준은?",
    opts: [
      { label: "⚖️ 모두가 편한 포지션으로 균형있게",      theme: "leaf" as ThemeId },
      { label: "🔬 최적의 시너지를 계산해서 조합",         theme: "rain" as ThemeId },
      { label: "👑 잘하는 사람들끼리 모아서 압살",         theme: "aka"  as ThemeId },
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
  const [currentQ, setCurrentQ] = useState(0);
  const [votes, setVotes] = useState<Record<ThemeId, number>>({ leaf: 0, rain: 0, aka: 0 });
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

  const inviteUrl = group && typeof window !== "undefined"
    ? `${window.location.origin}/invite/${group.inviteToken}` : "";

  function handleSelectOption(theme: ThemeId) { setSelected(theme); }

  function handleNextQuestion() {
    if (!selected) return;
    const newVotes = { ...votes, [selected]: votes[selected] + 1 };
    setVotes(newVotes);
    setSelected(null);
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

  // ── 그룹 없음: 퀴즈 플로우 ──────────────────────────────
  if (!group) {
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
        <button onClick={handleGoToCreate}
          className="w-full py-3.5 rounded-xl font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: info.color, boxShadow: `0 4px 20px ${info.color}55` }}>
          이 테마로 그룹 만들기 →
        </button>
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
            {q.opts.map(opt => (
              <button key={opt.theme} onClick={() => handleSelectOption(opt.theme)}
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
      <p className="text-sm mb-6" style={{ color:"var(--text-dim)" }}>
        내 역할: <span className="font-bold" style={{ color:GROUP_ROLE_COLORS[session?.user?.role ?? "viewer"] }}>
          {ROLE_LABELS[session?.user?.role ?? "viewer"]}
        </span>
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
