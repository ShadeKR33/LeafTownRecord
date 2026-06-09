"use client";

import { useState, useEffect, useRef } from "react";
import { loadNicknames } from "@/lib/stats";
import type { NicknameEntry } from "@/lib/types";
import GuideBanner from "@/components/GuideBanner";

type MiniGame = "shuriken" | "coin" | "scroll";
type Side = "blue" | "red" | null;

interface TeamResult {
  team1: string[];
  team2: string[];
  blueSide: 1 | 2 | null;
  redSide: 1 | 2 | null;
}

// ─── 표창 과녁 던지기 ─────────────────────────────────────────────────────────

function ShurikenGame({ onResult }: { onResult: (s: Side) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [throwing, setThrowing] = useState(false);
  const [result, setResult] = useState<Side>(null);
  const [scores, setScores] = useState<{ t1: number; t2: number } | null>(null);

  const drawTarget = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    const rings = [
      { r: r * 1, color: "#fee2e2" }, { r: r * 0.8, color: "#fecaca" },
      { r: r * 0.6, color: "#fca5a5" }, { r: r * 0.4, color: "#f87171" },
      { r: r * 0.2, color: "#ef4444" },
    ];
    rings.forEach(ring => {
      ctx.beginPath(); ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.fillStyle = ring.color; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    });
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b"; ctx.fill();
  };

  const drawShuriken = (ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, color: string) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const b = ((i + 0.5) / 4) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.lineTo(Math.cos(b) * 5, Math.sin(b) * 5);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#374151"; ctx.fill();
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    drawTarget(ctx, canvas.width / 2, canvas.height / 2, 90);
  }, []); // eslint-disable-line

  const throwShuriken = () => {
    if (throwing) return;
    setThrowing(true); setResult(null); setScores(null);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const t1r = Math.random() * 75, t1a = Math.random() * Math.PI * 2;
    const t2r = Math.random() * 75, t2a = Math.random() * Math.PI * 2;
    const t1x = cx + Math.cos(t1a) * t1r, t1y = cy + Math.sin(t1a) * t1r;
    const t2x = cx + Math.cos(t2a) * t2r, t2y = cy + Math.sin(t2a) * t2r;
    const s1 = Math.max(0, Math.round(100 - (t1r / 90) * 100));
    const s2 = Math.max(0, Math.round(100 - (t2r / 90) * 100));
    let frame = 0;
    const totalFrames = 40;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTarget(ctx, cx, cy, 90);
      if (frame > 10) {
        const p1 = Math.min((frame - 10) / (totalFrames - 10), 1);
        drawShuriken(ctx, cx + (t1x - cx) * p1, cy + (t1y - cy) * p1, p1 * Math.PI * 4, "#3b82f6");
      }
      if (frame > 20) {
        const p2 = Math.min((frame - 20) / (totalFrames - 20), 1);
        drawShuriken(ctx, cx + (t2x - cx) * p2, cy + (t2y - cy) * p2, p2 * Math.PI * 4, "#ef4444");
      }
      frame++;
      if (frame <= totalFrames) { requestAnimationFrame(animate); return; }
      drawShuriken(ctx, t1x, t1y, 0, "#3b82f6");
      drawShuriken(ctx, t2x, t2y, 0, "#ef4444");
      const side: Side = t1r <= t2r ? "blue" : "red";
      setScores({ t1: s1, t2: s2 }); setResult(side); setThrowing(false); onResult(side);
    };
    requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 text-xs font-semibold">
        <span style={{ color: "#3b82f6" }}>🔵 팀 1</span>
        <span style={{ color: "#ef4444" }}>🔴 팀 2</span>
      </div>
      <canvas ref={canvasRef} width={220} height={220} style={{ borderRadius: "50%", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", background: "#fef2f2" }} />
      {scores && (
        <div className="flex gap-6 text-sm font-bold">
          <span style={{ color: "#3b82f6" }}>팀 1: {scores.t1}점</span>
          <span style={{ color: "#ef4444" }}>팀 2: {scores.t2}점</span>
        </div>
      )}
      <GameBtn onClick={throwShuriken} disabled={throwing} label={throwing ? "표창 날아가는 중..." : "표창 던지기"} />
      <ResultLabel result={result} />
    </div>
  );
}

// ─── 동전 던지기 ──────────────────────────────────────────────────────────────

function CoinGame({ onResult }: { onResult: (s: Side) => void }) {
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<Side>(null);
  const coinRef = useRef<HTMLDivElement>(null);

  const flip = () => {
    if (flipping) return;
    setFlipping(true); setResult(null);
    const isBlue = Math.random() < 0.5;
    const totalFlips = (6 + Math.floor(Math.random() * 4)) * 180 + (isBlue ? 0 : 180);
    if (coinRef.current) {
      coinRef.current.style.transition = "transform 1.8s cubic-bezier(0.23,1,0.32,1)";
      coinRef.current.style.transform = `rotateY(${totalFlips}deg)`;
    }
    setTimeout(() => {
      const side: Side = isBlue ? "blue" : "red";
      setResult(side); setFlipping(false); onResult(side);
    }, 1900);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div style={{ perspective: "600px" }}>
        <div ref={coinRef} style={{ width: 150, height: 150, borderRadius: "50%", position: "relative", transformStyle: "preserve-3d", transition: "transform 0s" }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", backfaceVisibility:"hidden", background:"radial-gradient(circle at 35% 35%, #93c5fd, #1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(29,78,216,0.4)", fontSize:"48px" }}>🔵</div>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", backfaceVisibility:"hidden", transform:"rotateY(180deg)", background:"radial-gradient(circle at 35% 35%, #fca5a5, #b91c1c)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(185,28,28,0.4)", fontSize:"48px" }}>🔴</div>
        </div>
      </div>
      <GameBtn onClick={flip} disabled={flipping} label={flipping ? "동전 날아가는 중..." : "동전 던지기"} />
      <ResultLabel result={result} />
    </div>
  );
}

// ─── 두루마리 봉인 뽑기 ────────────────────────────────────────────────────────

function ScrollGame({ onResult }: { onResult: (s: Side) => void }) {
  const [picked, setPicked] = useState<0|1|null>(null);
  const [result, setResult] = useState<Side>(null);
  const [sides, setSides] = useState<[Side, Side]>([null, null]);

  const pick = (idx: 0|1) => {
    if (picked !== null) return;
    const isBlue = Math.random() < 0.5;
    const s: [Side, Side] = idx === 0
      ? [isBlue?"blue":"red", isBlue?"red":"blue"]
      : [isBlue?"red":"blue", isBlue?"blue":"red"];
    setSides(s); setPicked(idx);
    const side = s[idx]!;
    setResult(side); onResult(side);
  };
  const reset = () => { setPicked(null); setResult(null); setSides([null,null]); };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>두루마리 하나를 선택하세요</p>
      <div className="flex gap-8">
        {([0,1] as const).map(idx => {
          const isOpen = picked !== null;
          const s = sides[idx];
          return (
            <div key={idx} onClick={() => pick(idx)} style={{ cursor: isOpen?"default":"pointer" }}>
              <div style={{
                width: 100, height: 160, borderRadius: 12,
                background: isOpen && s
                  ? s==="blue" ? "linear-gradient(180deg,#dbeafe,#1d4ed8)" : "linear-gradient(180deg,#fee2e2,#b91c1c)"
                  : "linear-gradient(180deg,#f5f0e8,#d4c4a0)",
                border: isOpen && s
                  ? s==="blue" ? "2px solid #1d4ed8" : "2px solid #b91c1c"
                  : "2px solid #a08060",
                boxShadow: picked===idx ? "0 0 20px rgba(0,0,0,0.25)" : "0 4px 12px rgba(0,0,0,0.1)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, transition: "all 0.4s",
                transform: picked===idx ? "scale(1.08)" : "scale(1)",
              }}>
                {isOpen && s ? (
                  <>
                    <div style={{ fontSize: 42 }}>{s==="blue"?"🔵":"🔴"}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{s==="blue"?"블루":"레드"}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 32 }}>📜</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b5a3e" }}>봉인 {idx+1}</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {result && <ResetBtn onClick={reset} label="다시 뽑기" />}
      <ResultLabel result={result} />
    </div>
  );
}

// ─── 공통 컴포넌트 ─────────────────────────────────────────────────────────────

function GameBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled} className="px-6 py-2.5 rounded-full font-bold text-sm transition-all"
      style={{ background: disabled?"var(--border)":"var(--accent)", color:"#fff", cursor: disabled?"not-allowed":"pointer", opacity: disabled?0.7:1 }}>
      {label}
    </button>
  );
}

function ResetBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="px-6 py-2.5 rounded-full font-bold text-sm"
      style={{ background:"var(--hover)", color:"var(--accent)", border:"1px solid var(--border-green)", cursor:"pointer" }}>
      {label}
    </button>
  );
}

function ResultLabel({ result }: { result: Side }) {
  if (!result) return null;
  return (
    <div className="text-center font-bold text-lg" style={{ color: result==="blue"?"#2563eb":"#dc2626" }}>
      {result==="blue" ? "🔵 블루 사이드!" : "🔴 레드 사이드!"}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [nicknames, setNicknames] = useState<NicknameEntry[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [miniGame, setMiniGame] = useState<MiniGame>("shuriken");
  const [sideResult, setSideResult] = useState<Side>(null);
  const [blueSide, setBlueSide] = useState<1|2|null>(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"select"|"assign"|"game"|"result">("select");
  const [announceFormat, setAnnounceFormat] = useState<"3판2선" | "5판3선">("3판2선");
  const [announceDate, setAnnounceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [announceTime, setAnnounceTime] = useState(() => `${String(new Date().getHours()).padStart(2, "0")}:00`);
  const [positions, setPositions] = useState<Record<string, string>>({});

  const LANE_LIST = ["탑", "정글", "미드", "원딜", "서폿"];
  const LANE_COLORS: Record<string, string> = {
    탑: "#e06060", 정글: "#50a050", 미드: "#5090d0", 원딜: "#c0a030", 서폿: "#9060c0",
  };

  const setPlayerPos = (id: string, pos: string, teamGroup: string[]) => {
    setPositions(prev => {
      const next = { ...prev };
      teamGroup.forEach(pid => { if (pid !== id && next[pid] === pos) delete next[pid]; });
      if (next[id] === pos) delete next[id]; else next[id] = pos;
      return next;
    });
  };

  useEffect(() => { loadNicknames().then(setNicknames); }, []);

  const displayName = (id: string) => {
    const e = nicknames.find(n => n.id === id);
    return e?.realName?.trim() || e?.nickname || id;
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : prev.length < 10 ? [...prev, id] : prev);
  };

  // assign step
  const assignTo = (id: string, team: 1|2) => {
    setTeam1(prev => prev.filter(x=>x!==id));
    setTeam2(prev => prev.filter(x=>x!==id));
    if (team === 1 && team1.length < 5) setTeam1(prev => [...prev, id]);
    else if (team === 2 && team2.length < 5) setTeam2(prev => [...prev, id]);
  };
  const unassign = (id: string) => {
    setTeam1(prev => prev.filter(x=>x!==id));
    setTeam2(prev => prev.filter(x=>x!==id));
  };

  const unassigned = selected.filter(id => !team1.includes(id) && !team2.includes(id));
  const assignReady = team1.length > 0 && team2.length > 0 && unassigned.length === 0;

  const handleGameResult = (side: Side) => {
    setSideResult(side);
    const bs = side === "blue" ? 1 : 2;
    setBlueSide(bs as 1|2);
    setTimeout(() => setStep("result"), 2800);
  };

  const formatDateLabel = () => {
    const date = new Date(`${announceDate}T${announceTime}`);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const dow = days[date.getDay()];
    const h = date.getHours();
    const min = date.getMinutes();
    const ampm = h < 12 ? "오전" : "오후";
    const displayH = h % 12 || 12;
    const timeStr = min > 0 ? `${displayH}:${String(min).padStart(2, "0")}` : `${displayH}시`;
    return `${m}월 ${d}일 (${dow}) ${ampm} ${timeStr}`;
  };

  const getAnnouncement = () => {
    const blueTeam = blueSide === 1 ? team1 : team2;
    const redTeam  = blueSide === 1 ? team2 : team1;
    let teamBlock: string[];
    const orderTeam = (team: string[]) => {
      const ordered = LANE_LIST
        .map(pos => team.find(id => positions[id] === pos))
        .filter(Boolean) as string[];
      const unordered = team.filter(id => !positions[id]);
      return [...ordered, ...unordered].map(displayName).join(" ");
    };
    teamBlock = [
      `🔵 블루: ${orderTeam(blueTeam)}`,
      `🔴 레드: ${orderTeam(redTeam)}`,
    ];

    return [
      "🍃 나뭇잎 마을 내전 팀 편성 🍃",
      `${formatDateLabel()} | ${announceFormat}`,
      "",
      ...teamBlock,
      "",
    ].join("\n");
  };

  const copyAnnouncement = () => {
    navigator.clipboard.writeText(getAnnouncement()).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const reset = () => {
    setSelected([]); setTeam1([]); setTeam2([]);
    setSideResult(null); setBlueSide(null); setCopied(false);
    setPositions({});
    setStep("select");
  };

  const MINI_GAMES: { id: MiniGame; label: string }[] = [
    { id: "shuriken", label: "🎯 표창 던지기" },
    { id: "coin",     label: "🪙 동전 던지기" },
    { id: "scroll",   label: "📜 두루마리 뽑기" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideBanner
        pageKey="team"
        icon="🎲"
        title="팀 편성 페이지 사용법"
        guideAnchor="team"
        items={[
          "참여할 멤버를 선택하면 자동으로 두 팀으로 나눠줍니다.",
          "팀 구성 후 미니게임(표창 던지기·동전·두루마리)으로 블루/레드 사이드를 결정할 수 있어요.",
          "결과 화면에서 팀 구성과 사이드를 카카오톡 등에 바로 복사해 공유할 수 있습니다.",
          "포지션 배정도 함께 입력하면 공유 텍스트에 포지션까지 표시됩니다.",
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold" style={{ color: "var(--accent)" }}>🎲 팀 편성</h2>
        {step !== "select" && (
          <button onClick={reset} className="text-sm px-3 py-1.5 rounded-full font-semibold"
            style={{ background:"var(--hover)", color:"var(--text-muted)", border:"1px solid var(--border)", cursor:"pointer" }}>
            처음으로
          </button>
        )}
      </div>

      {/* ── Step 1: 플레이어 선택 ── */}
      {step === "select" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>오늘 참여할 플레이어를 선택하세요 (최대 10명)</p>
            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>{selected.length}명</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {nicknames.map(n => {
              const isSelected = selected.includes(n.id);
              const name = n.realName?.trim() || n.nickname;
              return (
                <button key={n.id} onClick={() => toggleSelect(n.id)}
                  className="px-3 py-2.5 rounded-lg text-sm font-semibold text-left transition-all"
                  style={{ background: isSelected?"var(--hover)":"var(--panel)", border: isSelected?"2px solid var(--accent)":"1px solid var(--border)", color: isSelected?"var(--accent)":"var(--text)", cursor: !isSelected&&selected.length>=10?"not-allowed":"pointer", opacity: !isSelected&&selected.length>=10?0.45:1 }}>
                  {isSelected?"✓ ":""}{name}
                  {n.nickname !== name && <span className="block text-xs mt-0.5" style={{ color:"var(--text-dim)" }}>{n.nickname}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center">
            <button onClick={() => setStep("assign")} disabled={selected.length < 2}
              className="px-8 py-3 rounded-full font-bold text-base"
              style={{ background: selected.length<2?"var(--border)":"var(--accent)", color:"#fff", cursor: selected.length<2?"not-allowed":"pointer", opacity: selected.length<2?0.6:1 }}>
              팀 배정하기 ({selected.length}명)
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: 팀 직접 배정 ── */}
      {step === "assign" && (
        <div>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            각 플레이어를 팀 1 또는 팀 2로 배정하세요
          </p>

          {/* 미배정 풀 */}
          {unassigned.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>미배정</div>
              <div className="flex flex-wrap gap-2">
                {unassigned.map(id => (
                  <div key={id} className="flex items-center gap-1 rounded-lg px-2 py-1.5"
                    style={{ background:"var(--panel)", border:"1px solid var(--border)" }}>
                    <span className="text-sm font-semibold" style={{ color:"var(--text)" }}>{displayName(id)}</span>
                    <button onClick={() => assignTo(id, 1)} disabled={team1.length >= 5} className="text-xs px-1.5 py-0.5 rounded font-bold ml-1"
                      style={{ background: team1.length>=5?"#e5e7eb":"#dbeafe", color: team1.length>=5?"#9ca3af":"#1d4ed8", cursor: team1.length>=5?"not-allowed":"pointer" }}>팀1</button>
                    <button onClick={() => assignTo(id, 2)} disabled={team2.length >= 5} className="text-xs px-1.5 py-0.5 rounded font-bold"
                      style={{ background: team2.length>=5?"#e5e7eb":"#fee2e2", color: team2.length>=5?"#9ca3af":"#b91c1c", cursor: team2.length>=5?"not-allowed":"pointer" }}>팀2</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 팀 박스 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {([team1, team2] as const).map((t, i) => (
              <div key={i} className="rounded-xl p-4"
                style={{ background: i===0?"#eff6ff":"#fff1f2", border: i===0?"2px solid #3b82f6":"2px solid #ef4444" }}>
                <div className="font-bold text-sm mb-3" style={{ color: i===0?"#1d4ed8":"#b91c1c" }}>
                  {i===0?"🔵 팀 1":"🔴 팀 2"}
                  <span className="ml-2 font-normal text-xs">({t.length}명)</span>
                </div>
                <div className="space-y-2">
                  {t.map(id => (
                    <div key={id} className="rounded-lg px-2 py-1.5"
                      style={{ background: i===0?"#dbeafe88":"#fee2e288", border: i===0?"1px solid #93c5fd":"1px solid #fca5a5" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold" style={{ color: i===0?"#1d4ed8":"#b91c1c" }}>{displayName(id)}</span>
                        <span onClick={() => { unassign(id); setPositions(p => { const n={...p}; delete n[id]; return n; }); }}
                          className="text-xs cursor-pointer opacity-50 hover:opacity-100" style={{ color: i===0?"#1d4ed8":"#b91c1c" }}>×</span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {LANE_LIST.map(pos => {
                          const active = positions[id] === pos;
                          const takenByOther = t.some(pid => pid !== id && positions[pid] === pos);
                          return (
                            <button key={pos} onClick={() => setPlayerPos(id, pos, t)}
                              className="text-xs px-1.5 py-0.5 rounded font-bold transition-all"
                              style={{
                                background: active ? LANE_COLORS[pos] : takenByOther ? "transparent" : LANE_COLORS[pos] + "22",
                                color: active ? "#fff" : takenByOther ? "var(--text-dim)" : LANE_COLORS[pos],
                                border: `1px solid ${active ? LANE_COLORS[pos] : takenByOther ? "var(--border)" : LANE_COLORS[pos] + "66"}`,
                                opacity: takenByOther ? 0.35 : 1,
                                cursor: "pointer",
                              }}>
                              {pos}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button onClick={() => setStep("game")} disabled={!assignReady}
              className="px-8 py-3 rounded-full font-bold text-base"
              style={{ background: !assignReady?"var(--border)":"var(--accent)", color:"#fff", cursor: !assignReady?"not-allowed":"pointer", opacity: !assignReady?0.6:1 }}>
              {unassigned.length > 0 ? `${unassigned.length}명 미배정` : "미니게임으로 진영 결정 →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: 미니게임 ── */}
      {step === "game" && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[team1, team2].map((t, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background:"var(--panel)", border:"1px solid var(--border)" }}>
                <div className="text-xs font-bold mb-1.5" style={{ color: i===0?"#1d4ed8":"#b91c1c" }}>팀 {i+1}</div>
                {t.map(id => (
                  <div key={id} className="text-sm py-0.5 font-semibold flex items-center gap-1.5" style={{ color:"var(--text)" }}>
                    {positions[id] && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: LANE_COLORS[positions[id]] + "22", color: LANE_COLORS[positions[id]], minWidth: 28, textAlign: "center" }}>
                        {positions[id]}
                      </span>
                    )}
                    {displayName(id)}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="rounded-xl p-6" style={{ background:"var(--panel)", border:"1px solid var(--border)" }}>
            <p className="text-center text-sm font-semibold mb-4" style={{ color:"var(--text-muted)" }}>
              미니게임으로 팀 1의 진영을 결정하세요!
            </p>
            {/* 미니게임 탭 */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {MINI_GAMES.map(g => (
                <button key={g.id} onClick={() => { setMiniGame(g.id); setSideResult(null); }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{ background: miniGame===g.id?"var(--accent)":"var(--hover)", color: miniGame===g.id?"#fff":"var(--text-muted)", border: miniGame===g.id?"none":"1px solid var(--border)", cursor:"pointer" }}>
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              {miniGame==="shuriken"  && <ShurikenGame  key="shuriken"  onResult={handleGameResult} />}
              {miniGame==="coin"      && <CoinGame      key="coin"      onResult={handleGameResult} />}

              {miniGame==="scroll"    && <ScrollGame    key="scroll"    onResult={handleGameResult} />}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: 최종 결과 ── */}
      {step === "result" && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {(["blue","red"] as const).map(color => {
              const sideNum = color==="blue" ? blueSide : blueSide===1?2:1;
              const players = sideNum===1 ? team1 : team2;
              return (
                <div key={color} className="rounded-xl p-5"
                  style={{ background: color==="blue"?"linear-gradient(135deg,#eff6ff,#dbeafe)":"linear-gradient(135deg,#fff1f2,#fee2e2)", border: color==="blue"?"2px solid #3b82f6":"2px solid #ef4444", boxShadow: color==="blue"?"0 4px 16px rgba(59,130,246,0.15)":"0 4px 16px rgba(239,68,68,0.15)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize:20 }}>{color==="blue"?"🔵":"🔴"}</span>
                    <span className="font-black text-sm" style={{ color: color==="blue"?"#1d4ed8":"#b91c1c" }}>{color==="blue"?"블루 사이드":"레드 사이드"}</span>
                  </div>
                  {LANE_LIST
                    .filter(pos => players.some(id => positions[id] === pos))
                    .map(pos => {
                      const pid = players.find(id => positions[id] === pos)!;
                      return (
                        <div key={pos} className="py-0.5 font-semibold text-sm flex items-center gap-2" style={{ color: color==="blue"?"#1e40af":"#991b1b" }}>
                          <span className="text-xs font-bold" style={{ color: LANE_COLORS[pos], minWidth: 28 }}>{pos}</span>
                          {displayName(pid)}
                        </div>
                      );
                    })
                  }
                  {players.filter(id => !positions[id]).map(id => (
                    <div key={id} className="py-0.5 font-semibold text-sm" style={{ color: color==="blue"?"#1e40af":"#991b1b" }}>{displayName(id)}</div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* 공지 설정 */}
          <div className="rounded-lg p-4 mb-5" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>📋 공지 설정</div>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--text-dim)" }}>시리즈 형식</div>
                <div className="flex gap-2">
                  {(["3판2선", "5판3선"] as const).map(fmt => (
                    <button key={fmt} onClick={() => setAnnounceFormat(fmt)}
                      className="px-3 py-1.5 rounded text-sm font-semibold"
                      style={{
                        background: announceFormat === fmt ? "var(--accent)" : "var(--panel-alt)",
                        color: announceFormat === fmt ? "#fff" : "var(--text-muted)",
                        border: `1px solid ${announceFormat === fmt ? "var(--accent)" : "var(--border)"}`,
                        cursor: "pointer",
                      }}>
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--text-dim)" }}>날짜</div>
                <input type="date" value={announceDate} onChange={e => setAnnounceDate(e.target.value)}
                  className="px-3 py-1.5 rounded text-sm outline-none"
                  style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }} />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--text-dim)" }}>시간</div>
                <input type="time" value={announceTime} onChange={e => setAnnounceTime(e.target.value)}
                  className="px-3 py-1.5 rounded text-sm outline-none"
                  style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }} />
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 flex-wrap mb-5">
            <button onClick={copyAnnouncement} className="px-5 py-2.5 rounded-full font-bold text-sm"
              style={{ background: copied?"#16a34a":"var(--accent)", color:"#fff", cursor:"pointer", transition:"background 0.2s" }}>
              {copied?"✓ 복사 완료!":"📋 공지 복사하기"}
            </button>
            <button onClick={() => { setStep("game"); setSideResult(null); setBlueSide(null); }}
              className="px-5 py-2.5 rounded-full font-bold text-sm"
              style={{ background:"var(--hover)", color:"var(--accent)", border:"1px solid var(--border-green)", cursor:"pointer" }}>
              진영 다시 뽑기
            </button>
            <button onClick={reset} className="px-5 py-2.5 rounded-full font-bold text-sm"
              style={{ background:"var(--hover)", color:"var(--text-muted)", border:"1px solid var(--border)", cursor:"pointer" }}>
              처음으로
            </button>
          </div>

          <div className="rounded-lg p-4 text-sm" style={{ background:"var(--panel-alt)", border:"1px solid var(--border)", color:"var(--text-muted)", whiteSpace:"pre-line", fontFamily:"monospace" }}>
            {getAnnouncement()}
          </div>
        </div>
      )}
    </div>
  );
}
