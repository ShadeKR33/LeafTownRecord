"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { loadGameRecords, saveGameRecords, loadNicknames } from "@/lib/stats";
import type { GameRecord, PlayerGameData, NapuSeriesRating } from "@/lib/types";
import GuideBanner from "@/components/GuideBanner";
import MatchStatsChart from "@/components/MatchStatsChart";

const POSITIONS = ["탑", "정글", "미드", "원딜", "서포터"];
const ROLE_COLORS: Record<string, string> = {
  탑: "#e06060", 정글: "#50a050", 미드: "#5090d0", 원딜: "#c0a030", 서포터: "#9060c0",
};

const emptyTeamRow = (position: string): PlayerGameData => ({
  nickname: "", position, champion: "",
});

const formatDuration = (mins?: number): string | null => {
  if (!mins) return null;
  const totalSeconds = Math.round(mins * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}분 ${s}초`;
};

const durationToMmSs = (mins: number): string => {
  const totalSeconds = Math.round(mins * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const parseMmSs = (str: string): number | undefined => {
  const match = str.trim().match(/^(\d{1,3}):(\d{2})$/);
  if (!match) return undefined;
  return parseInt(match[1]) + parseInt(match[2]) / 60;
};

const emptyGameRecord = (): Omit<GameRecord, "id"> => ({
  date: new Date().toISOString().slice(0, 10),
  gameFormat: "3판2선",
  gameNumber: 1,
  team1: POSITIONS.map(emptyTeamRow),
  team2: POSITIONS.map(emptyTeamRow),
  winTeam: 1,
  summary: "",
});

export default function CalendarPage() {
  const { data: session } = useSession();
  const isViewer = session?.user?.role === "viewer";

  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyGameRecord());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [durationStr, setDurationStr] = useState("");
  const [napuRating, setNapuRating] = useState<NapuSeriesRating | null>(null);
  const [showNapu, setShowNapu] = useState(false);
  const [napuLoading, setNapuLoading] = useState(false);
  const [napuGenerating, setNapuGenerating] = useState(false);

  // 닉네임 자동완성용
  const [allNicknames, setAllNicknames] = useState<string[]>([]);

  useEffect(() => {
    loadGameRecords().then((data) => {
      setRecords(data);
      setLoading(false);
    });
    loadNicknames().then((data) => {
      setAllNicknames(data.map((n) => n.nickname));
    });
  }, []);

  const save = (data: GameRecord[]) => {
    setRecords(data);
    saveGameRecords(data);
  };

  // 날짜 선택 시 나푸평점 조회
  useEffect(() => {
    if (!selectedDate) { setNapuRating(null); return; }
    setNapuLoading(true);
    fetch(`/api/napu-rating?date=${selectedDate}`)
      .then(r => r.json())
      .then((data: NapuSeriesRating | null) => setNapuRating(data ?? null))
      .catch(() => setNapuRating(null))
      .finally(() => setNapuLoading(false));
  }, [selectedDate]);

  const generateNapuRating = async () => {
    if (!selectedDate) return;
    setNapuGenerating(true);
    try {
      const res = await fetch("/api/napu-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });
      const data = await res.json() as NapuSeriesRating & { error?: string };
      if (data.error) alert(data.error);
      else setNapuRating(data);
    } catch { alert("평점 생성 중 오류가 발생했습니다"); }
    finally { setNapuGenerating(false); }
  };

  // ─── 폼 유틸 ────────────────────────────────────────────────────────
  const updateTeamPlayer = (team: 1 | 2, idx: number, field: keyof PlayerGameData, value: string | number) => {
    setForm((prev) => {
      const key = team === 1 ? "team1" : "team2";
      const updated = [...prev[key]];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, [key]: updated };
    });
  };

  const handleSubmit = () => {
    const hasPlayers = form.team1.some((p) => p.nickname.trim()) || form.team2.some((p) => p.nickname.trim());
    if (!hasPlayers || !form.date) return;

    const parsedDuration = durationStr.trim() ? parseMmSs(durationStr) : undefined;
    const gameDuration = parsedDuration !== undefined ? parsedDuration : form.gameDuration;
    const recordData = { ...form, gameDuration };

    if (editId) {
      save(records.map((r) => (r.id === editId ? { ...recordData, id: editId } : r)));
      setEditId(null);
    } else {
      save([...records, { ...recordData, id: Date.now().toString() }]);
    }
    setForm(emptyGameRecord());
    setDurationStr("");
    setShowForm(false);
  };

  const startEdit = (r: GameRecord) => {
    setForm({ date: r.date, gameFormat: r.gameFormat, gameNumber: r.gameNumber, team1: r.team1, team2: r.team2, winTeam: r.winTeam, summary: r.summary || "", bans: r.bans, gameDuration: r.gameDuration });
    setDurationStr(r.gameDuration ? durationToMmSs(r.gameDuration) : "");
    setEditId(r.id);
    setShowForm(true);
    setSelectedDate(null);
  };

  const deleteRecord = (id: string) => {
    save(records.filter((r) => r.id !== id));
  };

  // ─── 날짜별 그룹 ─────────────────────────────────────────────────────
  const monthRecords = records.filter((r) => r.date.startsWith(selectedMonth));
  const dateGroups = monthRecords.reduce<Record<string, GameRecord[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  const allMonths = Array.from(new Set(records.map((r) => r.date.slice(0, 7)))).sort().reverse();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const displayMonths = Array.from(new Set([currentMonth, ...allMonths])).sort().reverse();

  // 선택한 날의 기록
  const dayRecords = selectedDate ? (dateGroups[selectedDate] || []) : [];

  // ─── 달력 그리드 ────────────────────────────────────────────────────
  const [year, month] = selectedMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarCells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <GuideBanner
        pageKey="calendar"
        icon="📅"
        title="달력 페이지 사용법"
        guideAnchor="calendar"
        items={[
          "내전이 있었던 날짜에 점(●)이 표시됩니다. 날짜를 클릭하면 해당 날의 게임 목록을 볼 수 있어요.",
          "캡쳐 분석 페이지에서 등록한 기록도 달력에 자동으로 반영됩니다.",
          "게임 항목을 클릭하면 세부 내용을 수정하거나 삭제할 수 있어요.",
        ]}
      />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--accent)" }}>📅 내전 달력</h2>
      </div>

      {/* ─── 경기 기록 등록 폼 ─── */}
      {showForm && (
        <div className="mb-6 p-5 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--accent)" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--accent)" }}>
            {editId ? "경기 수정" : "새 경기 기록"}
          </h3>

          {/* 기본 정보 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>날짜</label>
              <input type="date" className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>시리즈 형식</label>
              <div className="flex gap-2">
                {(["3판2선", "5판3선"] as const).map((fmt) => (
                  <button key={fmt} onClick={() => setForm({ ...form, gameFormat: fmt, gameNumber: 1 })}
                    className="px-3 py-2 rounded text-xs font-semibold flex-1"
                    style={{ background: form.gameFormat === fmt ? "var(--accent)" : "var(--panel-alt)", color: form.gameFormat === fmt ? "var(--panel-alt)" : "var(--text-muted)", border: `1px solid ${form.gameFormat === fmt ? "var(--accent)" : "var(--border)"}` }}>
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>게임 번호</label>
              <div className="flex gap-1">
                {Array.from({ length: form.gameFormat === "3판2선" ? 3 : 5 }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setForm({ ...form, gameNumber: n })}
                    className="w-9 h-9 rounded text-sm font-bold"
                    style={{ background: form.gameNumber === n ? "var(--accent)" : "var(--panel-alt)", color: form.gameNumber === n ? "var(--panel-alt)" : "var(--text-muted)", border: `1px solid ${form.gameNumber === n ? "var(--accent)" : "var(--border)"}` }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>승리 팀</label>
              <div className="flex gap-2">
                {([1, 2] as const).map((t) => (
                  <button key={t} onClick={() => setForm({ ...form, winTeam: t })}
                    className="px-4 py-2 rounded text-sm font-bold flex-1"
                    style={{ background: form.winTeam === t ? "var(--win)" : "var(--panel-alt)", color: form.winTeam === t ? "var(--panel-alt)" : "var(--text-muted)", border: `1px solid ${form.winTeam === t ? "var(--win)" : "var(--border)"}` }}>
                    팀{t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 게임 시간 */}
          <div className="mb-4">
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>⏱ 게임 시간 (MM:SS)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="w-28 px-3 py-2 rounded text-sm"
                style={{ background: "var(--panel-alt)", border: `1px solid ${durationStr && parseMmSs(durationStr) === undefined ? "var(--loss)" : "var(--border)"}`, color: "var(--text)" }}
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                placeholder="32:15"
              />
              {durationStr && parseMmSs(durationStr) === undefined && (
                <span className="text-xs" style={{ color: "var(--loss)" }}>MM:SS 형식으로 입력 (예: 32:15)</span>
              )}
              {durationStr && parseMmSs(durationStr) !== undefined && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDuration(parseMmSs(durationStr))}</span>
              )}
            </div>
          </div>

          {/* 팀 입력 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {([1, 2] as const).map((teamNum) => {
              const teamKey = teamNum === 1 ? "team1" : "team2";
              const isWinner = form.winTeam === teamNum;
              return (
                <div key={teamNum} className="p-3 rounded-lg border"
                  style={{ borderColor: isWinner ? "var(--border-green)" : "var(--border)", background: "var(--panel-alt)" }}>
                  <div className="text-xs font-bold mb-3" style={{ color: isWinner ? "var(--win)" : "var(--loss)" }}>
                    팀 {teamNum} {isWinner ? "🏆 승리" : ""}
                  </div>
                  <div className="space-y-2">
                    {form[teamKey].map((player, idx) => (
                      <div key={idx} className="grid gap-1" style={{ gridTemplateColumns: "52px 1fr 100px" }}>
                        <span className="text-xs px-1 py-1.5 rounded text-center font-semibold"
                          style={{ background: (ROLE_COLORS[player.position || ""] || "var(--accent)") + "22", color: ROLE_COLORS[player.position || ""] || "var(--accent)" }}>
                          {(player.position || "").slice(0, 2)}
                        </span>
                        <input
                          list={`nicknames-list`}
                          className="px-2 py-1.5 rounded text-xs"
                          style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                          value={player.nickname}
                          onChange={(e) => updateTeamPlayer(teamNum, idx, "nickname", e.target.value)}
                          placeholder="닉네임" />
                        <input
                          className="px-2 py-1.5 rounded text-xs"
                          style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--accent)" }}
                          value={player.champion}
                          onChange={(e) => updateTeamPlayer(teamNum, idx, "champion", e.target.value)}
                          placeholder="챔피언" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 자동완성 datalist */}
          <datalist id="nicknames-list">
            {allNicknames.map((n) => <option key={n} value={n} />)}
          </datalist>

          {/* 요약 메모 */}
          <div className="mb-4">
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>경기 요약 (선택)</label>
            <textarea className="w-full px-3 py-2 rounded text-sm resize-none"
              style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
              rows={2} value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="이 경기의 메모나 요약" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-5 py-2 rounded text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--panel-alt)" }}>
              {editId ? "저장" : "등록"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setDurationStr(""); }} className="px-5 py-2 rounded text-sm" style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* ─── 월 선택 탭 ─── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {displayMonths.map((m) => (
          <button key={m} onClick={() => { setSelectedMonth(m); setSelectedDate(null); }}
            className="px-4 py-1.5 rounded-full text-sm transition-all"
            style={{ background: selectedMonth === m ? "var(--accent)" : "var(--panel)", color: selectedMonth === m ? "var(--panel-alt)" : "var(--text-muted)", border: `1px solid ${selectedMonth === m ? "var(--accent)" : "var(--border)"}`, fontWeight: selectedMonth === m ? 700 : 400 }}>
            {m.replace("-", "년 ")}월
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center" style={{ color: "var(--text-muted)" }}>
          <div className="text-3xl mb-4 animate-bounce">📅</div>
          <p>경기 기록을 불러오는 중입니다...</p>
        </div>
      ) : (
        <>
          {/* ─── 달력 그리드 ─── */}
          <div className="mb-6 rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border)" }}>
              {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                <div key={d} className="py-2 text-center text-xs font-semibold"
                  style={{ color: i === 0 ? "var(--loss)" : i === 6 ? "#5090d0" : "var(--text-muted)" }}>{d}</div>
              ))}
            </div>
            {/* 날짜 셀 */}
            <div className="grid grid-cols-7">
              {calendarCells.map((day, i) => {
                if (!day) return <div key={i} className="h-16 border-r border-b" style={{ borderColor: "var(--hover)" }} />;
                const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                const dayRecs = dateGroups[dateStr] || [];
                const hasRecord = dayRecs.length > 0;
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === new Date().toISOString().slice(0, 10);
                return (
                  <div key={i}
                    className="h-16 border-r border-b p-1 cursor-pointer transition-all"
                    style={{ borderColor: "var(--hover)", background: isSelected ? "var(--hover)" : "transparent" }}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}>
                    <div className="text-xs mb-1 flex items-center justify-center w-5 h-5 rounded-full"
                      style={{
                        color: isToday ? "var(--panel-alt)" : i % 7 === 0 ? "var(--loss)" : i % 7 === 6 ? "#5090d0" : "var(--text-muted)",
                        fontWeight: isToday ? 700 : 400,
                        background: isToday ? "var(--accent)" : "transparent",
                      }}>
                      {day}
                    </div>
                    {hasRecord && (
                      <div className="flex flex-wrap gap-0.5">
                        {dayRecs.slice(0, 3).map((r) => (
                          <span key={r.id} className="w-2 h-2 rounded-full"
                            style={{ background: r.winTeam === 1 ? "var(--win)" : "var(--loss)" }} />
                        ))}
                        {dayRecs.length > 3 && <span className="text-xs" style={{ color: "var(--text-muted)" }}>+{dayRecs.length - 3}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── 선택한 날의 상세 기록 ─── */}
          {selectedDate && (
            <div>
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <h3 className="font-bold text-base" style={{ color: "var(--accent)" }}>
                  {selectedDate} 경기 기록 ({dayRecords.length}경기)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNapu(true)}
                    className="px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                    style={{
                      background: napuRating
                        ? "linear-gradient(var(--panel-alt), var(--panel-alt)) padding-box, linear-gradient(135deg, #22c55e, #3b82f6) border-box"
                        : "var(--hover)",
                      border: napuRating ? "1px solid transparent" : "1px solid var(--border)",
                      color: napuRating ? "var(--accent)" : "var(--text-muted)",
                    }}>
                    🍃 나푸평점{napuRating ? " ✓" : napuLoading ? " ..." : ""}
                  </button>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="px-3 py-1 rounded text-xs font-semibold"
                    style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    ✕ 닫기
                  </button>
                </div>
              </div>

              {dayRecords.length === 0 ? (
                <div className="py-10 text-center rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  이 날의 경기 기록이 없습니다
                </div>
              ) : (
                <div className="space-y-4">
                  {dayRecords
                    .sort((a, b) => a.gameNumber - b.gameNumber)
                    .map((r) => (
                      <div key={r.id} className="p-4 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
                        {/* 경기 헤더 */}
                        <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: "1px solid var(--hover)" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-xs px-2 py-1 rounded font-semibold"
                              style={{ background: "var(--hover)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                              {r.gameFormat} · {r.gameNumber}경기{formatDuration(r.gameDuration) ? ` · ⏱ ${formatDuration(r.gameDuration)}` : ""}
                            </span>
                          </div>
                          {!isViewer && (
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(r)} className="px-2 py-1 rounded text-xs" style={{ background: "var(--hover)", color: "var(--accent)", border: "1px solid var(--border)" }}>수정</button>
                              <button onClick={() => deleteRecord(r.id)} className="px-2 py-1 rounded text-xs" style={{ background: "var(--hover)", color: "var(--loss)", border: "1px solid var(--border)" }}>삭제</button>
                            </div>
                          )}
                        </div>

                        {/* 경기 기록 상세 정보 (승패/KDA/DMG%/DT%/KP%, 딜량 비교, 밴픽) */}
                        <MatchStatsChart record={r} />

                        {/* 경기 요약 */}
                        {r.summary && (
                          <div className="mt-3 pt-3 text-xs" style={{ borderTop: "1px solid var(--hover)", color: "var(--text-muted)" }}>
                            💬 {r.summary}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 날짜 선택 안 됐을 때 이번 달 전체 목록 */}
          {!selectedDate && monthRecords.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-muted)" }}>이번 달 전체 경기</h3>
              <div className="space-y-2">
                {Object.entries(dateGroups)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([date, recs]) => (
                    <button key={date} onClick={() => setSelectedDate(date)}
                      className="w-full text-left px-4 py-3 rounded-lg border transition-all hover:brightness-125"
                      style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold" style={{ color: "var(--text)" }}>{date}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "var(--win)" }}>
                            {recs.filter((r) => r.winTeam === 1).length + recs.filter((r) => r.winTeam === 2).length}경기
                          </span>
                          <div className="flex gap-1">
                            {recs.map((r) => (
                              <span key={r.id} className="w-2.5 h-2.5 rounded-full"
                                style={{ background: r.winTeam === 1 ? "var(--win)" : "var(--loss)" }} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {recs[0]?.gameFormat} · 팀1: {recs[0]?.team1.filter((p) => p.nickname).map((p) => p.nickname).join(", ")}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {!selectedDate && monthRecords.length === 0 && (
            <div className="py-16 text-center rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              이 달에 기록된 경기가 없습니다
            </div>
          )}
        </>
      )}

      {/* ── 나푸평점 모달 ──────────────────────────────────────────── */}
      {showNapu && selectedDate && (
        <NapuRatingModal
          date={selectedDate}
          rating={napuRating}
          generating={napuGenerating}
          canGenerate={!isViewer}
          onGenerate={generateNapuRating}
          onClose={() => setShowNapu(false)}
        />
      )}
    </div>
  );
}

// ── 나푸평점 모달 컴포넌트 ──────────────────────────────────────────────────
const SCORE_COLOR_T1 = "#e05050";
const SCORE_COLOR_T2 = "#4f8ef7";
const POS_EMOJI: Record<string, string> = {
  탑: "⚔️", 정글: "🌿", 미드: "⚡", 원딜: "🎯", 서포터: "🛡️",
};

function scoreStyle(score: number, teamColor: string) {
  const alpha = score >= 8 ? "ff" : score >= 6 ? "dd" : "99";
  return {
    background: teamColor + "22",
    border: `1.5px solid ${teamColor}${alpha}`,
    color: teamColor,
    fontWeight: 800,
    fontSize: 15,
    borderRadius: 6,
    padding: "3px 10px",
    minWidth: 48,
    textAlign: "center" as const,
    letterSpacing: "0.02em",
    opacity: score < 5 ? 0.7 : 1,
  };
}

function NapuRatingModal({ date, rating, generating, canGenerate, onGenerate, onClose }: {
  date: string;
  rating: NapuSeriesRating | null;
  generating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const normNick = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const getScore = (nick: string) =>
    rating?.ratings.find(r => r.nickname === nick)?.score
    ?? rating?.ratings.find(r => normNick(r.nickname) === normNick(nick))?.score
    ?? null;

  const copyToClipboard = () => {
    if (!rating) return;
    const winner = rating.team1Wins > rating.team2Wins ? "팀1 우승" : "팀2 우승";
    const lines: string[] = [
      `🍃 나뭇잎 마을 나푸평점`,
      `📅 ${date}  |  팀1 ${rating.team1Wins} : ${rating.team2Wins} 팀2  (${winner})`,
      ``,
      `🔴 팀 1`,
    ];
    rating.team1Players.forEach(p => {
      const s = getScore(p);
      lines.push(`  ${p}  ${s !== null ? s.toFixed(1) : "—"}`);
    });
    lines.push(``);
    lines.push(`🔵 팀 2`);
    rating.team2Players.forEach(p => {
      const s = getScore(p);
      lines.push(`  ${p}  ${s !== null ? s.toFixed(1) : "—"}`);
    });
    lines.push(``);
    lines.push(`📊 평가기준: KDA > 딜기여도 > CS > 받은피해 > 승패`);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const maxRows = rating
    ? Math.max(rating.team1Players.length, rating.team2Players.length)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={onClose}
    >
      <div
        className="w-full mx-4 rounded-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 480, background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <div className="font-black text-base tracking-tight" style={{ color: "var(--text)" }}>
              🍃 나뭇잎 마을 나푸평점
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{date}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "var(--hover)", color: "var(--text-muted)", fontSize: 16 }}>✕</button>
        </div>

        {/* 시리즈 결과 */}
        {rating && (
          <div className="flex items-center justify-center gap-6 py-4 px-6"
            style={{ borderBottom: "1px solid var(--hover)" }}>
            <span className="font-black text-base" style={{ color: SCORE_COLOR_T1 }}>팀 1</span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black" style={{ color: rating.team1Wins > rating.team2Wins ? SCORE_COLOR_T1 : "var(--text-muted)" }}>
                {rating.team1Wins}
              </span>
              <span style={{ color: "var(--text-dim)", fontWeight: 700, fontSize: 18 }}>─</span>
              <span className="text-3xl font-black" style={{ color: rating.team2Wins > rating.team1Wins ? SCORE_COLOR_T2 : "var(--text-muted)" }}>
                {rating.team2Wins}
              </span>
            </div>
            <span className="font-black text-base" style={{ color: SCORE_COLOR_T2 }}>팀 2</span>
          </div>
        )}

        {/* 플레이어 평점 */}
        <div className="px-4 py-3 flex flex-col gap-1.5">
          {rating ? (
            Array.from({ length: maxRows }).map((_, i) => {
              const p1 = rating.team1Players[i];
              const p2 = rating.team2Players[i];
              const s1 = p1 ? getScore(p1) : null;
              const s2 = p2 ? getScore(p2) : null;
              return (
                <div key={i} className="flex items-center gap-2">
                  {/* 팀1 플레이어 */}
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{p1 ?? ""}</span>
                    {s1 !== null && <div style={scoreStyle(s1, SCORE_COLOR_T1)}>{s1.toFixed(1)}</div>}
                    {p1 && s1 === null && <div style={{ ...scoreStyle(0, SCORE_COLOR_T1), opacity: 0.3 }}>—</div>}
                  </div>

                  {/* 중앙 구분선 */}
                  <div className="w-6 flex-shrink-0 text-center text-sm" style={{ color: "var(--text-dim)" }}>│</div>

                  {/* 팀2 플레이어 */}
                  <div className="flex items-center gap-2 flex-1">
                    {s2 !== null && <div style={scoreStyle(s2, SCORE_COLOR_T2)}>{s2.toFixed(1)}</div>}
                    {p2 && s2 === null && <div style={{ ...scoreStyle(0, SCORE_COLOR_T2), opacity: 0.3 }}>—</div>}
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{p2 ?? ""}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center" style={{ color: "var(--text-muted)" }}>
              {canGenerate ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-sm">이 시리즈의 나푸평점이 아직 생성되지 않았습니다.</div>
                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                    KDA, 딜량, CS 등 스탯이 입력된 경우에만 생성 가능합니다.
                  </div>
                </div>
              ) : (
                <div className="text-sm">평점이 아직 생성되지 않았습니다.</div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 flex items-center justify-between gap-2"
          style={{ borderTop: "1px solid var(--border)" }}>
          <div className="text-xs" style={{ color: "var(--text-dim)" }}>
            {rating
              ? `생성: ${new Date(rating.generatedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : "AI 자동 분석 · 스탯 기반"}
          </div>
          <div className="flex items-center gap-2">
            {rating && (
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{
                  background: copied ? "#22c55e22" : "var(--hover)",
                  color: copied ? "#22c55e" : "var(--text-muted)",
                  border: `1px solid ${copied ? "#22c55e66" : "var(--border)"}`,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}>
                {copied ? "✓ 복사됨" : "📋 복사"}
              </button>
            )}
            {canGenerate && (
              <button
                onClick={onGenerate}
                disabled={generating}
                className="px-4 py-1.5 rounded-lg text-xs font-bold"
                style={{
                  background: generating ? "var(--hover)" : "var(--accent)",
                  color: generating ? "var(--text-muted)" : "#fff",
                  border: "none",
                  opacity: generating ? 0.7 : 1,
                  cursor: generating ? "not-allowed" : "pointer",
                }}>
                {generating ? "⏳ 분석 중..." : rating ? "🔄 재생성" : "✨ AI 평점 생성"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
