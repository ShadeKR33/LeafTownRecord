"use client";

import { useState, useEffect } from "react";
import { loadGameRecords, saveGameRecords, loadNicknames } from "@/lib/stats";
import type { GameRecord, PlayerGameData } from "@/lib/types";
import GuideBanner from "@/components/GuideBanner";

const POSITIONS = ["탑", "정글", "미드", "원딜", "서포터"];
const ROLE_COLORS: Record<string, string> = {
  탑: "#e06060", 정글: "#50a050", 미드: "#5090d0", 원딜: "#c0a030", 서포터: "#9060c0",
};

const emptyTeamRow = (position: string): PlayerGameData => ({
  nickname: "", position, champion: "",
});

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

    if (editId) {
      save(records.map((r) => (r.id === editId ? { ...form, id: editId } : r)));
      setEditId(null);
    } else {
      save([...records, { ...form, id: Date.now().toString() }]);
    }
    setForm(emptyGameRecord());
    setShowForm(false);
  };

  const startEdit = (r: GameRecord) => {
    setForm({ date: r.date, gameFormat: r.gameFormat, gameNumber: r.gameNumber, team1: r.team1, team2: r.team2, winTeam: r.winTeam, summary: r.summary || "" });
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

  const TeamTable = ({ team, label, isWinner }: { team: PlayerGameData[]; label: string; isWinner: boolean }) => (
    <div className={`flex-1 min-w-0 p-3 rounded-lg transition-all ${isWinner ? "border shadow-sm" : ""}`}
         style={isWinner ? { background: "rgba(82, 168, 255, 0.08)", borderColor: "rgba(82, 168, 255, 0.3)" } : {}}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold" style={{ color: isWinner ? "var(--win)" : "var(--loss)" }}>
          {label}
        </span>
        {isWinner && <span className="text-xs px-2 py-0.5 rounded shadow-sm" style={{ background: "var(--win)", color: "var(--panel-alt)", fontWeight: "bold" }}>🏆 승리</span>}
      </div>
      <div className="space-y-1">
        {team.filter((p) => p.nickname).map((p, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs" style={{ background: isWinner ? "rgba(255, 255, 255, 0.5)" : "var(--panel-alt)" }}>
            <span className="w-12 text-center rounded px-1" style={{ background: (ROLE_COLORS[p.position || ""] || "var(--accent)") + "22", color: ROLE_COLORS[p.position || ""] || "var(--accent)", fontSize: "10px", fontWeight: "bold" }}>
              {p.position}
            </span>
            <span className="flex-1 font-semibold" style={{ color: "var(--text)" }}>{p.nickname}</span>
            {p.champion && <span style={{ color: "var(--accent)", fontWeight: "bold" }}>{p.champion}</span>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <GuideBanner
        pageKey="calendar"
        icon="📅"
        title="달력 페이지 사용법"
        guideAnchor="calendar"
        items={[
          "내전이 있었던 날짜에 점(●)이 표시됩니다. 날짜를 클릭하면 해당 날의 게임 목록을 볼 수 있어요.",
          "우측 상단 '+ 기록 추가' 버튼으로 게임 결과를 직접 입력할 수 있습니다.",
          "캡쳐 분석 페이지에서 등록한 기록도 달력에 자동으로 반영됩니다.",
          "게임 항목을 클릭하면 세부 내용을 수정하거나 삭제할 수 있어요.",
        ]}
      />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--accent)" }}>📅 내전 달력</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyGameRecord()); setSelectedDate(null); }}
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--panel-alt)" }}>
          + 경기 기록 추가
        </button>
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
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-5 py-2 rounded text-sm" style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base" style={{ color: "var(--accent)" }}>
                  {selectedDate} 경기 기록 ({dayRecords.length}경기)
                </h3>
                <button onClick={() => { setForm({ ...emptyGameRecord(), date: selectedDate }); setShowForm(true); setEditId(null); }}
                  className="px-3 py-1.5 rounded text-xs font-semibold"
                  style={{ background: "var(--accent)", color: "var(--panel-alt)" }}>
                  + 이 날 경기 추가
                </button>
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
                              {r.gameFormat} · {r.gameNumber}경기
                            </span>
                            <span className="text-sm font-bold"
                              style={{ color: r.winTeam === 1 ? "var(--win)" : "var(--loss)" }}>
                              팀{r.winTeam} 승리
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(r)} className="px-2 py-1 rounded text-xs" style={{ background: "var(--hover)", color: "var(--accent)", border: "1px solid var(--border)" }}>수정</button>
                            <button onClick={() => deleteRecord(r.id)} className="px-2 py-1 rounded text-xs" style={{ background: "var(--hover)", color: "var(--loss)", border: "1px solid var(--border)" }}>삭제</button>
                          </div>
                        </div>

                        {/* 팀 구성 */}
                        <div className="flex flex-col md:flex-row gap-4">
                          <TeamTable team={r.team1} label="팀 1" isWinner={r.winTeam === 1} />
                          <div className="hidden md:flex items-center" style={{ color: "var(--border)", fontSize: "24px" }}>VS</div>
                          <TeamTable team={r.team2} label="팀 2" isWinner={r.winTeam === 2} />
                        </div>

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
    </div>
  );
}
