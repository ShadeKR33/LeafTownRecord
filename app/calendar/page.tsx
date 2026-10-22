"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { loadGameRecords, saveGameRecords, loadNicknames } from "@/lib/stats";
import type { GameRecord, PlayerGameData } from "@/lib/types";
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
  title: "",
  category: "내전",
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
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [seriesEditDate, setSeriesEditDate] = useState<string | null>(null);
  const [seriesForm, setSeriesForm] = useState<{
    title: string; category: string; gameFormat: GameRecord["gameFormat"]; date: string;
    customWinScore: number; customLoseScore: number;
  }>({
    title: "", category: "내전", gameFormat: "3판2선", date: "",
    customWinScore: 3, customLoseScore: -1,
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

    const parsedDuration = durationStr.trim() ? parseMmSs(durationStr) : undefined;
    const gameDuration = parsedDuration !== undefined ? parsedDuration : form.gameDuration;

    if (editId) {
      // 단판 수정: 시리즈 레벨 필드(제목·카테고리·형식·날짜)는 원본 유지
      const original = records.find((r) => r.id === editId);
      const recordData = {
        ...form,
        gameDuration,
        title: original?.title,
        category: original?.category,
        gameFormat: original?.gameFormat ?? form.gameFormat,
        date: original?.date ?? form.date,
      };
      save(records.map((r) => (r.id === editId ? { ...recordData, id: editId } : r)));
      setEditId(null);
    } else {
      const title = form.title?.trim() || undefined;
      save([...records, { ...form, gameDuration, title, id: Date.now().toString() }]);
    }
    setForm(emptyGameRecord());
    setDurationStr("");
    setShowForm(false);
  };

  const startEdit = (r: GameRecord) => {
    setForm({ date: r.date, gameFormat: r.gameFormat, gameNumber: r.gameNumber, team1: r.team1, team2: r.team2, winTeam: r.winTeam, summary: r.summary || "", bans: r.bans, gameDuration: r.gameDuration, title: r.title || "", category: r.category || "내전" });
    setDurationStr(r.gameDuration ? durationToMmSs(r.gameDuration) : "");
    setEditId(r.id);
    setShowForm(true);
    setShowSeriesForm(false);
    setSelectedDate(null);
  };

  const startEditSeries = (date: string, recs: GameRecord[]) => {
    setSeriesEditDate(date);
    const isBalance = recs.some(r => r.category === "밸런스판");
    setSeriesForm({
      title: recs[0]?.title || "",
      category: recs[0]?.category || "내전",
      gameFormat: recs[0]?.gameFormat || "3판2선",
      date,
      customWinScore: recs[0]?.customWinScore ?? (isBalance ? 2 : 3),
      customLoseScore: recs[0]?.customLoseScore ?? -1,
    });
    setShowSeriesForm(true);
    setShowForm(false);
    setEditId(null);
  };

  const handleSeriesSubmit = () => {
    if (!seriesEditDate) return;
    const updated = records.map((r) => {
      if (r.date !== seriesEditDate) return r;
      return {
        ...r,
        date: seriesForm.date,
        title: seriesForm.title.trim() || undefined,
        category: seriesForm.category,
        gameFormat: seriesForm.gameFormat,
        customWinScore: seriesForm.customWinScore,
        customLoseScore: seriesForm.customLoseScore,
      };
    });
    save(updated);
    setShowSeriesForm(false);
    if (seriesForm.date !== seriesEditDate) setSelectedDate(seriesForm.date);
    setSeriesEditDate(null);
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

      {/* ─── 시리즈 수정 폼 ─── */}
      {showSeriesForm && (
        <div className="mb-6 p-5 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--accent)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--accent)" }}>시리즈 수정</h3>
            <span className="text-xs px-2 py-1 rounded" style={{ background: "var(--hover)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
              {seriesEditDate} · 전체 {records.filter(r => r.date === seriesEditDate).length}판에 일괄 적용
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>경기 제목 <span style={{ color: "var(--text-dim)" }}>(선택)</span></label>
              <input type="text" className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                placeholder="예: 팀 바뀌기 전 마지막 스크림"
                value={seriesForm.title}
                onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>카테고리</label>
              <div className="flex gap-2 flex-wrap">
                {(["내전", "스크림", "밸런스판", "월즈"] as const).map((cat) => (
                  <button key={cat} type="button"
                    onClick={() => setSeriesForm({ ...seriesForm, category: cat })}
                    className="px-3 py-2 rounded text-xs font-semibold flex-1"
                    style={{ background: seriesForm.category === cat ? "var(--accent)" : "var(--panel-alt)", color: seriesForm.category === cat ? "var(--panel-alt)" : "var(--text-muted)", border: `1px solid ${seriesForm.category === cat ? "var(--accent)" : "var(--border)"}` }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>날짜</label>
              <input type="date" className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={seriesForm.date}
                onChange={(e) => setSeriesForm({ ...seriesForm, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>시리즈 형식</label>
              <div className="flex gap-2">
                {(["3판2선", "5판3선"] as const).map((fmt) => (
                  <button key={fmt} type="button"
                    onClick={() => setSeriesForm({ ...seriesForm, gameFormat: fmt as GameRecord["gameFormat"] })}
                    className="px-3 py-2 rounded text-xs font-semibold flex-1"
                    style={{ background: seriesForm.gameFormat === fmt ? "var(--accent)" : "var(--panel-alt)", color: seriesForm.gameFormat === fmt ? "var(--panel-alt)" : "var(--text-muted)", border: `1px solid ${seriesForm.gameFormat === fmt ? "var(--accent)" : "var(--border)"}` }}>
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* 점수 설정 */}
          <div className="mb-4">
            <label className="text-xs mb-2 block font-semibold" style={{ color: "var(--text-muted)" }}>점수 설정</label>
            {seriesForm.category === "밸런스판" ? (
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>전원</span>
                <input type="number" className="w-20 px-3 py-2 rounded text-sm text-center font-bold"
                  style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                  value={seriesForm.customWinScore}
                  onChange={(e) => setSeriesForm({ ...seriesForm, customWinScore: Number(e.target.value) })} />
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>점</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "var(--win)", border: "1px solid var(--border-green)" }}>이긴 팀</span>
                  <input type="number" className="w-20 px-3 py-2 rounded text-sm text-center font-bold"
                    style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--win)" }}
                    value={seriesForm.customWinScore}
                    onChange={(e) => setSeriesForm({ ...seriesForm, customWinScore: Number(e.target.value) })} />
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>점</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: "var(--loss)", border: "1px solid #ef444444" }}>진 팀</span>
                  <input type="number" className="w-20 px-3 py-2 rounded text-sm text-center font-bold"
                    style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--loss)" }}
                    value={seriesForm.customLoseScore}
                    onChange={(e) => setSeriesForm({ ...seriesForm, customLoseScore: Number(e.target.value) })} />
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>점</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSeriesSubmit} className="px-5 py-2 rounded text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--panel-alt)" }}>저장</button>
            <button onClick={() => { setShowSeriesForm(false); setSeriesEditDate(null); }} className="px-5 py-2 rounded text-sm" style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>취소</button>
          </div>
        </div>
      )}

      {/* ─── 경기 기록 등록 폼 ─── */}
      {showForm && (
        <div className="mb-6 p-5 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--accent)" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--accent)" }}>
            {editId ? "판별 수정" : "새 경기 기록"}
          </h3>

          {/* 새 경기 등록 시에만: 경기 제목 & 카테고리 */}
          {!editId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>경기 제목 <span style={{ color: "var(--text-dim)" }}>(선택)</span></label>
                <input type="text" className="w-full px-3 py-2 rounded text-sm"
                  style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                  placeholder="예: 팀 바뀌기 전 마지막 스크림"
                  value={form.title ?? ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>카테고리</label>
                <div className="flex gap-2 flex-wrap">
                  {(["내전", "스크림", "밸런스판", "월즈"] as const).map((cat) => (
                    <button key={cat} type="button"
                      onClick={() => setForm({ ...form, category: cat })}
                      className="px-3 py-2 rounded text-xs font-semibold flex-1"
                      style={{ background: form.category === cat ? "var(--accent)" : "var(--panel-alt)", color: form.category === cat ? "var(--panel-alt)" : "var(--text-muted)", border: `1px solid ${form.category === cat ? "var(--accent)" : "var(--border)"}` }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {editId && (
            <div className="mb-4 px-3 py-2 rounded text-xs" style={{ background: "var(--hover)", color: "var(--text-dim)", border: "1px solid var(--border)" }}>
              제목·카테고리·날짜·시리즈 형식은 <strong style={{ color: "var(--text-muted)" }}>시리즈 수정</strong>에서 변경하세요
            </div>
          )}

          {/* 기본 정보 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {!editId && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>날짜</label>
              <input type="date" className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            )}
            {!editId && (
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
            )}
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

      {/* ─── 월 선택 드롭다운 ─── */}
      {(() => {
        const monthGameCounts = displayMonths.reduce<Record<string, number>>((acc, m) => {
          acc[m] = new Set(records.filter(r => r.date.startsWith(m)).map(r => r.date)).size;
          return acc;
        }, {});
        const label = selectedMonth.replace("-", "년 ") + "월";
        return (
          <div className="relative mb-5" style={{ maxWidth: 240 }}>
            <button onClick={() => setMonthPickerOpen(v => !v)}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--accent)", cursor: "pointer" }}>
              <span>📅 {label}</span>
              <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{monthPickerOpen ? "▲" : "▼"}</span>
            </button>
            {monthPickerOpen && (
              <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-xl"
                style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                {displayMonths.map(m => {
                  const count = monthGameCounts[m] ?? 0;
                  const isActive = selectedMonth === m;
                  return (
                    <button key={m}
                      onClick={() => { setSelectedMonth(m); setSelectedDate(null); setMonthPickerOpen(false); }}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-sm transition-all hover:brightness-95"
                      style={{
                        background: isActive ? "var(--accent)" + "22" : "transparent",
                        color: isActive ? "var(--accent)" : "var(--text-muted)",
                        fontWeight: isActive ? 700 : 400,
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                      }}>
                      <span>{m.replace("-", "년 ")}월</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: count > 0 ? "var(--accent)" + "22" : "var(--hover)", color: count > 0 ? "var(--accent)" : "var(--text-dim)" }}>
                        {count}경기
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

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
                  {!isViewer && (
                    <button
                      onClick={() => startEditSeries(selectedDate!, dayRecords)}
                      className="px-3 py-1 rounded text-xs font-semibold"
                      style={{ background: "var(--hover)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
                      시리즈 수정
                    </button>
                  )}
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
                <>
                {/* 시리즈 점수 변동 요약 */}
                {(() => {
                  const isBalance = dayRecords.some(r => r.category === "밸런스판");
                  const t1w = dayRecords.filter(r => r.winTeam === 1).length;
                  const t2w = dayRecords.filter(r => r.winTeam === 2).length;
                  const winner = t1w > t2w ? 1 : t2w > t1w ? 2 : null;
                  return (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg flex-wrap" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
                      <span className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>점수 변동</span>
                      {isBalance ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(109,40,217,0.15)", color: "#7c3aed", border: "1px solid #7c3aed55" }}>
                          밸런스판 · 전원 +2
                        </span>
                      ) : winner ? (
                        <>
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(34,197,94,0.12)", color: "var(--win)", border: "1px solid var(--border-green)" }}>
                            팀{winner} +3
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "var(--loss)", border: "1px solid #ef444444" }}>
                            팀{winner === 1 ? 2 : 1} -1
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-dim)" }}>({t1w}:{t2w})</span>
                        </>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-dim)" }}>진행 중 ({t1w}:{t2w})</span>
                      )}
                    </div>
                  );
                })()}
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
                </>
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
                        <span className="font-semibold" style={{ color: "var(--text)" }}>
                          {recs[0]?.title ? <>{recs[0].title} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({date})</span></> : date}
                        </span>
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {recs[0]?.gameFormat} · 팀1: {recs[0]?.team1.filter((p) => p.nickname).map((p) => p.nickname).join(", ")}
                        </span>
                        {(() => {
                          const isBalance = recs.some(r => r.category === "밸런스판");
                          const t1w = recs.filter(r => r.winTeam === 1).length;
                          const t2w = recs.filter(r => r.winTeam === 2).length;
                          const winner = t1w > t2w ? 1 : t2w > t1w ? 2 : null;
                          if (isBalance) return (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(109,40,217,0.15)", color: "#7c3aed", border: "1px solid #7c3aed55" }}>밸런스 +2</span>
                          );
                          if (winner) return (
                            <>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(34,197,94,0.12)", color: "var(--win)", border: "1px solid var(--border-green)" }}>팀{winner} +3</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "var(--loss)", border: "1px solid #ef444444" }}>팀{winner === 1 ? 2 : 1} -1</span>
                            </>
                          );
                          return null;
                        })()}
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

