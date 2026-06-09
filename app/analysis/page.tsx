"use client";

import { useState, useRef, useEffect } from "react";
import { loadGameRecords, saveGameRecords, loadNicknames } from "@/lib/stats";
import type { GameRecord, NicknameEntry } from "@/lib/types";
import GuideBanner from "@/components/GuideBanner";

interface AnalysisResult {
  date?: string;
  winTeam: 1 | 2;
  team1: { nickname: string; champion: string }[];
  team2: { nickname: string; champion: string }[];
  bans?: { team1: string[]; team2: string[] };
}

type GameFormat = "3판2선" | "5판3선";

interface DraftResult {
  gameNumber: number;
  result: AnalysisResult;
}

const CHAMPION_LIST = [
  "가렌", "갈리오", "갱플랭크", "그라가스", "그레이브즈", "그웬", "나르", "나미", "나서스", "나피리", "노틸러스", "녹턴", "누누와 윌럼프", "니달리", "니코", "닐라",
  "다리우스", "다이애나", "드레이븐", "라이즈", "라칸", "람머스", "럭스", "럼블", "레나타 글라스크", "레넥톤", "레오나", "렉사이", "렐", "렝가", "루시안", "룰루", "르블랑",
  "리 신", "리븐", "리산드라", "릴리아", "마스터 이", "마오카이", "말자하", "말파이트", "모데카이저", "모르가나", "문도 박사", "미스 포츈", "밀리오", "바드", "바루스", "바이",
  "베이가", "베인", "벡스", "벨베스", "벨코즈", "볼리베어", "브라움", "브랜드", "브라이어", "블라디미르", "블리츠크랭크", "비에고", "빅토르", "뽀삐", "사미라", "사이온", "사일러스", "샤코", "세나",
  "세라핀", "세주아니", "세트", "소나", "소라카", "쉔", "쉬바나", "스웨인", "스카너", "스몰더", "시비르", "신 짜오", "신드라", "신지드", "쓰레쉬", "아리", "아무무", "아우렐리온 솔", "아이번",
  "아지르", "아칼리", "아크샨", "아트록스", "아펠리오스", "알리스타", "암베사", "애니", "애니비아", "애쉬", "야스오", "에코", "엘리스", "오공", "오로라", "오른", "오리아나", "올라프", "요네",
  "요릭", "우디르", "우르곳", "워윅", "유미", "이렐리아", "이블린", "이즈리얼", "일라오이", "자르반 4세", "자야", "자이라", "자크", "잔나", "잭스", "제드", "제라스", "제리", "제이스", "조이",
  "직스", "진", "질리언", "징크스", "초가스", "카르마", "카밀", "카사딘", "카서스", "카시오페아", "카이사", "카직스", "카타리나", "칼리스타", "케넨", "케이틀린", "케인", "케일", "코그모", "코르키",
  "퀸", "크산테", "클레드", "키아나", "킨드레드", "타릭", "탈론", "탈리야", "탐 켄치", "트런들", "트리스타나", "트린다미어", "트위스티드 페이트", "트위치", "티모", "파이크", "판테온", "피들스틱", "피오라",
  "피즈", "하이머딩거", "헤카림", "흐웨이"
];

function ChampionInput({
  id,
  value,
  onChange,
  className = "w-1/2"
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim().length >= 1
    ? CHAMPION_LIST.filter(c => c.includes(value)).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && filtered[highlighted]) { e.preventDefault(); select(filtered[highlighted]); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Tab" && id) {
      // Tab key navigation for champion inputs:
      // id format: champ-input-dIdx-team-pIdx or ban-input-dIdx-team-bIdx
      const parts = id.split("-");
      if (parts.length === 5 && parts[1] === "input") {
        const type = parts[0]; // champ or ban
        const dIdx = parseInt(parts[2]);
        const team = parseInt(parts[3]) as 1 | 2;
        const idx = parseInt(parts[4]);
        
        let nextId = "";
        if (type === "champ") {
          if (!e.shiftKey) {
            if (idx < 4) {
              nextId = `champ-input-${dIdx}-${team}-${idx + 1}`;
            } else if (idx === 4 && team === 1) {
              nextId = `champ-input-${dIdx}-2-0`;
            }
          } else {
            if (idx > 0) {
              nextId = `champ-input-${dIdx}-${team}-${idx - 1}`;
            } else if (idx === 0 && team === 2) {
              nextId = `champ-input-${dIdx}-1-4`;
            }
          }
        }

        if (nextId) {
          const nextEl = document.getElementById(nextId);
          if (nextEl) {
            e.preventDefault();
            (nextEl as HTMLInputElement).focus();
            (nextEl as HTMLInputElement).select();
          }
        }
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setHighlighted(0); setOpen(true); }}
        onFocus={() => { if (value.trim().length >= 1) setOpen(true); }}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm rounded outline-none"
        style={{ background: "var(--hover)", border: "1px solid var(--border)", color: "var(--accent)" }}
        placeholder="챔피언"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-0.5 rounded-lg border shadow-xl overflow-auto"
          style={{ background: "var(--panel)", borderColor: "var(--border)", maxHeight: 220 }}>
          {filtered.map((name, i) => (
            <div key={name}
              onMouseDown={e => { e.preventDefault(); select(name); }}
              onMouseEnter={() => setHighlighted(i)}
              className="px-3 py-2 text-sm cursor-pointer transition-colors"
              style={{
                background: i === highlighted ? "var(--hover)" : "transparent",
                color: i === highlighted ? "var(--accent)" : "var(--text)",
              }}>
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [dbNicknames, setDbNicknames] = useState<NicknameEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadGameRecords(), loadNicknames()]).then(([recordsData, nicknamesData]) => {
      setRecords(recordsData);
      setDbNicknames(nicknamesData);
      setInitialLoading(false);
    });
  }, []);

  const [gameFormat, setGameFormat] = useState<GameFormat>("3판2선");
  
  const maxGames = gameFormat === "3판2선" ? 3 : 5;
  const winsNeeded = gameFormat === "3판2선" ? 2 : 3;

  // 세트장 사진 업로드용 배열 상태 (인덱스 0 ~ maxGames-1)
  const [images, setImages] = useState<(string | null)[]>(Array(maxGames).fill(null));
  const [imageFiles, setImageFiles] = useState<(File | null)[]>(Array(maxGames).fill(null));

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); // 0 ~ 100
  const [error, setError] = useState<string | null>(null);

  // AI 분석 완료 후 검수 단계 상태
  const [draftResults, setDraftResults] = useState<DraftResult[]>([]);
  const [successSaved, setSuccessSaved] = useState(false);
  const [dragging, setDragging] = useState<{ gIndex: number; team: 1|2; pIndex: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ gIndex: number; team: 1|2; pIndex: number } | null>(null);

  // 1세트 왼쪽 팀 기준으로 정규화된 닉네임 집합 (= 시리즈 내 "팀 A")
  const [canonicalTeam1Nicks, setCanonicalTeam1Nicks] = useState<Set<string>>(new Set());

  // 닉네임 정규화 (공백·대소문자 무시)
  const normNick = (s: string) => s.replace(/\s+/g, "").toLowerCase();

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 닉네임 보정 헬퍼
  const correctNickname = (name: string, nicknamesList: NicknameEntry[]): string => {
    if (!name) return name;
    const normName = name.replace(/\s+/g, "").toLowerCase();
    
    // DB 등록된 닉네임 목록에서 띄어쓰기 및 소문자 무시 매칭
    const found = nicknamesList.find((entry) => {
      if (entry.nickname.replace(/\s+/g, "").toLowerCase() === normName) {
        return true;
      }
      return (entry.altNicknames || []).some(
        (alt) => alt.replace(/\s+/g, "").toLowerCase() === normName
      );
    });
    
    return found ? found.nickname : name;
  };

  const handleFile = (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    const newFiles = [...imageFiles];
    newFiles[index] = file;
    setImageFiles(newFiles);

    const reader = new FileReader();
    reader.onload = (e) => {
      const newImages = [...images];
      newImages[index] = e.target?.result as string;
      setImages(newImages);
    };
    reader.readAsDataURL(file);
    
    // 초기화
    setError(null);
    setDraftResults([]);
    setSuccessSaved(false);
  };

  const handleDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(index, file);
  };

  const analyzeAll = async () => {
    // 업로드된 이미지만 추출
    const uploadTasks = images.map((img, i) => {
      return img ? { index: i, image: img, file: imageFiles[i] } : null;
    }).filter(t => t !== null) as { index: number, image: string, file: File }[];

    if (uploadTasks.length === 0) {
      setError("분석할 이미지를 최소 1장 이상 등록해주세요.");
      return;
    }

    setLoading(true);
    setLoadingProgress(0);
    setError(null);
    setDraftResults([]);
    setSuccessSaved(false);

    try {
      const results: DraftResult[] = [];
      let cnt = 0;
      // 순차적으로 하나씩 호출하여 서버 과부하 및 토큰 에러 방지
      for (const task of uploadTasks) {
        const base64Data = task.image.split(",")[1];
        const mediaType = task.file.type;
        
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: base64Data,
            mediaType,
            gameFormat,
            gameNumber: task.index + 1,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`${task.index + 1}세트 분석 중 오류 발생: ${errData.error || res.status}`);
        }

        const data: AnalysisResult = await res.json();
        results.push({ gameNumber: task.index + 1, result: data });
        
        cnt++;
        setLoadingProgress(Math.floor((cnt / uploadTasks.length) * 100));
      }

      // 첫 번째 결과에서 날짜 자동 추출
      const extractedDate = results[0]?.result?.date;
      if (extractedDate) setSelectedDate(extractedDate);

      // 모두 완료되면 Edit 모드(draftResults)로 전시 및 닉네임 자동 보정
      setDraftResults(results.map(r => {
        const t1Corrected = r.result.team1.map(p => ({
          ...p,
          champion: "",
          nickname: correctNickname(p.nickname, dbNicknames)
        }));
        const t2Corrected = r.result.team2.map(p => ({
          ...p,
          champion: "",
          nickname: correctNickname(p.nickname, dbNicknames)
        }));
        const bansCorrected = {
          team1: ["", "", "", "", ""],
          team2: ["", "", "", "", ""],
        };
        
        return {
          ...r,
          result: {
            ...r.result,
            team1: t1Corrected,
            team2: t2Corrected,
            bans: bansCorrected
          }
        };
      }));

      // 1세트 블루 진영(왼쪽) 5명을 시리즈 "팀 A"로 확정
      if (results.length > 0) {
        setCanonicalTeam1Nicks(
          new Set(results[0].result.team1.map(p => normNick(correctNickname(p.nickname, dbNicknames))))
        );
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(`분석 실패: ${message}\n확인 후 다시 시도해주세요.`);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  // Draft 데이터 수정 핸들러
  const updateDraftTeamWin = (gIndex: number, winTeam: 1 | 2) => {
    const newData = [...draftResults];
    newData[gIndex].result.winTeam = winTeam;
    setDraftResults(newData);
  };

  const updateDraftChampion = (gIndex: number, team: 1 | 2, pIndex: number, champion: string) => {
    const newData = [...draftResults];
    if (team === 1) newData[gIndex].result.team1[pIndex].champion = champion;
    else newData[gIndex].result.team2[pIndex].champion = champion;
    setDraftResults(newData);
  };

  const updateDraftNickname = (gIndex: number, team: 1 | 2, pIndex: number, nickname: string) => {
    const newData = [...draftResults];
    const corrected = correctNickname(nickname, dbNicknames);
    if (team === 1) newData[gIndex].result.team1[pIndex].nickname = corrected;
    else newData[gIndex].result.team2[pIndex].nickname = corrected;
    setDraftResults(newData);
  };

  const updateDraftBan = (gIndex: number, team: 1 | 2, bIndex: number, champion: string) => {
    const newData = [...draftResults];
    if (!newData[gIndex].result.bans) {
      newData[gIndex].result.bans = { team1: ["", "", "", "", ""], team2: ["", "", "", "", ""] };
    }
    const bans = newData[gIndex].result.bans;
    if (team === 1) {
      const newBans = [...(bans.team1 || ["", "", "", "", ""])];
      newBans[bIndex] = champion;
      bans.team1 = newBans;
    } else {
      const newBans = [...(bans.team2 || ["", "", "", "", ""])];
      newBans[bIndex] = champion;
      bans.team2 = newBans;
    }
    setDraftResults(newData);
  };

  const reorderDraftPlayer = (gIndex: number, team: 1 | 2, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const newData = draftResults.map(d => ({
      ...d,
      result: { ...d.result, team1: [...d.result.team1], team2: [...d.result.team2], bans: d.result.bans ? { ...d.result.bans } : undefined }
    }));
    const arr = team === 1 ? newData[gIndex].result.team1 : newData[gIndex].result.team2;
    const [removed] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, removed);
    setDraftResults(newData);
  };

  // 블루/레드 진영 전체 스왑 (AI가 진영을 잘못 인식했을 때)
  const swapDraftSides = (gIndex: number) => {
    const newData = [...draftResults];
    const { team1, team2, winTeam, bans } = newData[gIndex].result;
    newData[gIndex].result.team1 = team2;
    newData[gIndex].result.team2 = team1;
    newData[gIndex].result.winTeam = winTeam === 1 ? 2 : 1;
    if (bans) {
      newData[gIndex].result.bans = {
        team1: bans.team2 || ["", "", "", "", ""],
        team2: bans.team1 || ["", "", "", "", ""],
      };
    }
    setDraftResults(newData);
  };

  // 저장 시 팀 A(1세트 블루 진영)가 항상 team1이 되도록 정규화
  const normalizeForSave = (result: AnalysisResult): { team1: AnalysisResult["team1"]; team2: AnalysisResult["team2"]; winTeam: 1 | 2; bans?: AnalysisResult["bans"] } => {
    if (canonicalTeam1Nicks.size === 0) return result;
    const t1Match = result.team1.filter(p => canonicalTeam1Nicks.has(normNick(p.nickname))).length;
    const t2Match = result.team2.filter(p => canonicalTeam1Nicks.has(normNick(p.nickname))).length;
    if (t2Match > t1Match) {
      // 팀 A가 레드 진영(team2)에 있으므로 스왑 (밴도 함께 뒤집기)
      const swappedBans = result.bans ? { team1: result.bans.team2, team2: result.bans.team1 } : undefined;
      return { team1: result.team2, team2: result.team1, winTeam: result.winTeam === 1 ? 2 : 1, bans: swappedBans };
    }
    return result;
  };

  const confirmAndSave = async () => {
    try {
      const currentRecords = await loadGameRecords();
      
      const newRecords: GameRecord[] = draftResults.map(draft => {
        const normalized = normalizeForSave(draft.result);
        
        // 밴에서 빈 문자열 제거하고, 밴 챔피언이 있으면 저장
        const cleanBans = normalized.bans
          ? {
              team1: normalized.bans.team1.filter(Boolean),
              team2: normalized.bans.team2.filter(Boolean),
            }
          : undefined;

        return {
          id: Date.now().toString() + "_" + draft.gameNumber,
          date: selectedDate,
          gameFormat,
          gameNumber: draft.gameNumber,
          team1: normalized.team1,
          team2: normalized.team2,
          winTeam: normalized.winTeam,
          ...(cleanBans && (cleanBans.team1.length > 0 || cleanBans.team2.length > 0) ? { bans: cleanBans } : {}),
        };
      });

      currentRecords.push(...newRecords);
      await saveGameRecords(currentRecords);
      setSuccessSaved(true);
      setDraftResults([]);
    } catch (err) {
      setError("데이터 저장 중 오류가 발생했습니다.");
    }
  };

  const resetAll = () => {
    setImages(Array(maxGames).fill(null));
    setImageFiles(Array(maxGames).fill(null));
    setDraftResults([]);
    setCanonicalTeam1Nicks(new Set());
    setError(null);
    setSuccessSaved(false);
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center" style={{ color: "var(--text-muted)" }}>
        <div className="text-3xl mb-4 animate-bounce">⏳</div>
        <p>기록 및 소환사 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <GuideBanner
        pageKey="analysis"
        icon="📸"
        title="캡쳐 분석 페이지 사용법"
        guideAnchor="analysis"
        items={[
          "내전 결과 화면(탭 결과창)을 캡쳐한 이미지를 업로드하면 AI가 자동으로 닉네임·챔피언·승패를 인식합니다.",
          "여러 장을 한 번에 올리면 3판 2선·5판 3선 묶음으로 한 번에 처리돼요.",
          "분석 결과가 틀렸을 경우 검수 화면에서 직접 수정한 뒤 저장할 수 있어요.",
          "저장된 기록은 랭킹·챔피언 분석·달력 페이지에 자동 반영됩니다.",
        ]}
      />
      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>📸 다전제 일괄 분석 및 검수</h2>
      <p className="text-sm mb-6 flex flex-col gap-1" style={{ color: "var(--text-muted)" }}>
        <span>게임 캡쳐 화면을 순서대로 업로드하여 AI 분석을 돌리고,</span>
        <span>저장 전에 챔피언 이름이나 승패가 제대로 되었는지 가볍게 수정한 뒤에 확정할 수 있습니다.</span>
      </p>

      {/* 경기 정보 설정 */}
      <div className="mb-5 p-4 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>경기 정보</div>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>📅 날짜</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded text-sm outline-none"
              style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--text-muted)" }}>🎮 시리즈 형식</label>
            <div className="flex gap-2">
              {(["3판2선", "5판3선"] as GameFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => {
                    setGameFormat(fmt);
                    // 형식 변경 시 이미지 슬롯 배열 재생성
                    const newMax = fmt === "3판2선" ? 3 : 5;
                    setImages(Array(newMax).fill(null));
                    setImageFiles(Array(newMax).fill(null));
                    setDraftResults([]);
                    setSuccessSaved(false);
                  }}
                  className="px-4 py-2 rounded text-sm font-semibold transition-all"
                  style={{
                    background: gameFormat === fmt ? "var(--accent)" : "var(--panel-alt)",
                    color: gameFormat === fmt ? "var(--panel-alt)" : "var(--text-muted)",
                    border: `1px solid ${gameFormat === fmt ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-2 text-xs" style={{ color: "#527852" }}>
            * 사진은 해당되는 판수(최대 {maxGames}장)까지만 올리시면 됩니다. (예: 2대0 종료 시 2장만 업로드)
          </div>
        </div>
      </div>

      {/* 에러 및 성공 */}
      {error && (
        <div className="p-4 rounded-lg border mb-4 whitespace-pre-line" style={{ background: "#1a0d0d", borderColor: "#5a2020", color: "var(--loss)" }}>
          {error}
        </div>
      )}

      {successSaved && (
        <div className="p-4 flex justify-between items-center rounded-lg border mb-4 font-bold" style={{ background: "var(--hover)", borderColor: "var(--accent-light)", color: "var(--accent-dark)" }}>
          🎉 검수를 마치고 랭킹 페이지에 정상적으로 등록되었습니다!
          <button onClick={resetAll} className="px-3 py-1 rounded text-xs font-normal" style={{ background: "var(--panel-alt)", border: "1px solid var(--border)"}}>다른 시리즈 분석하기</button>
        </div>
      )}

      {/* 업로드 존 (Draft가 없을 때만 보임) */}
      {draftResults.length === 0 && !successSaved && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: maxGames }).map((_, i) => (
              <div 
                key={i}
                className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer relative overflow-hidden transition-all group"
                style={{
                  height: "200px",
                  borderColor: images[i] ? "var(--accent)" : "var(--border)",
                  background: "var(--panel)",
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(i, e)}
                onClick={() => fileInputRefs.current[i]?.click()}
              >
                {images[i] ? (
                  <>
                    <img src={images[i] as string} alt={`${i+1}세트`} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-10 transition-opacity" />
                    <div className="relative z-10 text-center">
                      <div className="text-xl mb-1">✅</div>
                      <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{i + 1}세트 이미지 등록됨</div>
                      <div className="text-xs mt-2" style={{ color: "var(--accent)" }}>클릭하여 변경</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl mb-2 opacity-50">📁</div>
                    <div className="text-sm font-bold mb-1" style={{ color: "var(--text-muted)" }}>{i + 1}세트 사진 업로드</div>
                  </>
                )}
                <input
                  ref={(el) => { fileInputRefs.current[i] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(i, e.target.files[0])}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={analyzeAll}
              disabled={loading || !images.some(img => img !== null)}
              className="px-8 py-4 rounded font-bold text-lg transition-all"
              style={{
                background: loading || !images.some(img => img !== null) ? "var(--border)" : "var(--accent)",
                color: loading || !images.some(img => img !== null) ? "var(--text-muted)" : "var(--panel-alt)",
                cursor: loading || !images.some(img => img !== null) ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(82,216,90,0.2)"
              }}
            >
              {loading ? `순차 분석 중... (${loadingProgress}%)` : `🚀 업로드된 사진 일괄 분석하기`}
            </button>
          </div>
        </div>
      )}

      {/* 분석 완료 후 검수 (Edit / Review) 존 */}
      {draftResults.length > 0 && (
        <div className="space-y-6 mb-8">
          <div className="p-4 rounded border flex items-center justify-between" style={{ background: "rgba(82, 216, 90, 0.1)", borderColor: "var(--accent)" }}>
            <div>
              <span className="font-bold mr-2 text-lg">💡 1차 AI 분석 결과 확인!</span>
              <br/><span className="text-sm" style={{ color: "var(--text-muted)" }}>아래 칸에서 승리 팀이 맞는지, 챔피언 이름이 엉뚱하지 확인하고, <b>틀린 부분이 있으면 직접 타자를 쳐서(클릭해서) 수정한 뒤 저장 버튼</b>을 눌러주세요.</span>
            </div>
            <button onClick={resetAll} className="px-4 py-2 text-sm rounded bg-transparent border ml-4 whitespace-nowrap" style={{ borderColor: 'var(--border)'}}>다시 분석하기</button>
          </div>

          {draftResults.map((draft, dIdx) => {
            // 이 세트에서 팀 A(1세트 블루)가 어느 진영에 있는지 감지
            const t1Canon = canonicalTeam1Nicks.size > 0
              ? draft.result.team1.filter(p => canonicalTeam1Nicks.has(normNick(p.nickname))).length
              : -1;
            const t2Canon = canonicalTeam1Nicks.size > 0
              ? draft.result.team2.filter(p => canonicalTeam1Nicks.has(normNick(p.nickname))).length
              : -1;
            const teamAOnRed = t2Canon > t1Canon; // 팀 A가 현재 레드 진영에 감지됨

            return (
            <div key={draft.gameNumber} className="rounded-lg border overflow-hidden" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ background: "var(--panel-alt)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-base" style={{ color: "var(--accent)" }}>{draft.gameNumber}세트 분석 결과</h3>
                  {/* 팀 A 진영 위치 배지 */}
                  {canonicalTeam1Nicks.size > 0 && dIdx === 0 && (
                    <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "rgba(50,100,220,0.15)", color: "#6699ff" }}>
                      📌 기준 세트 — 블루 진영 = 팀 A
                    </span>
                  )}
                  {canonicalTeam1Nicks.size > 0 && dIdx > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{
                      background: teamAOnRed ? "rgba(220,50,50,0.15)" : "rgba(50,100,220,0.15)",
                      color: teamAOnRed ? "#ff7777" : "#6699ff"
                    }}>
                      🔄 팀 A → {teamAOnRed ? "레드" : "블루"} 진영 감지 · 저장 시 자동 조정
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* 진영 전체 스왑 버튼 (AI가 좌우를 바꿔 읽었을 때) */}
                  <button
                    onClick={() => swapDraftSides(dIdx)}
                    className="px-2 py-1 text-xs rounded border transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "transparent" }}
                    title="블루/레드 진영 전체 교체 (AI가 좌우를 잘못 읽었을 때)"
                  >
                    ⇄ 진영 스왑
                  </button>

                  {/* 승패 강제 스위칭 컨트롤러 */}
                  <div className="flex bg-[#111] p-1 rounded border" style={{ borderColor: "var(--border)" }}>
                    <button
                       onClick={() => updateDraftTeamWin(dIdx, 1)}
                       className="px-3 py-1 text-sm font-bold rounded transition-all"
                       style={{ background: draft.result.winTeam === 1 ? "var(--win)" : "transparent", color: draft.result.winTeam === 1 ? "#fff" : "var(--text-dim)" }}>
                      🔵 블루 승리
                    </button>
                    <button
                       onClick={() => updateDraftTeamWin(dIdx, 2)}
                       className="px-3 py-1 text-sm font-bold rounded transition-all ml-1"
                       style={{ background: draft.result.winTeam === 2 ? "var(--loss)" : "transparent", color: draft.result.winTeam === 2 ? "#fff" : "var(--text-dim)" }}>
                      🔴 레드 승리
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 gap-6">
                {/* 블루 진영 렌더링 */}
                <div>
                  <div className="text-sm font-bold mb-3 border-b pb-1 flex items-center gap-2" style={{ color: "var(--win)", borderColor: "var(--border)" }}>
                    🔵 블루 진영
                    {canonicalTeam1Nicks.size > 0 && (
                      <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                        ({dIdx === 0 || !teamAOnRed ? "팀 A" : "팀 B"})
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {draft.result.team1.map((p, pIdx) => (
                      <div key={pIdx}
                        className="flex gap-2 items-center rounded"
                        draggable
                        onDragStart={() => setDragging({ gIndex: dIdx, team: 1, pIndex: pIdx })}
                        onDragOver={e => { e.preventDefault(); setDragOver({ gIndex: dIdx, team: 1, pIndex: pIdx }); }}
                        onDrop={() => {
                          if (dragging?.gIndex === dIdx && dragging?.team === 1) reorderDraftPlayer(dIdx, 1, dragging.pIndex, pIdx);
                          setDragging(null); setDragOver(null);
                        }}
                        onDragEnd={() => { setDragging(null); setDragOver(null); }}
                        style={{
                          opacity: dragging?.gIndex === dIdx && dragging?.team === 1 && dragging?.pIndex === pIdx ? 0.35 : 1,
                          outline: dragOver?.gIndex === dIdx && dragOver?.team === 1 && dragOver?.pIndex === pIdx ? "2px dashed var(--accent)" : "none",
                          borderRadius: 6, padding: "1px",
                        }}
                      >
                        <span title="드래그로 순서 변경" style={{ color: "var(--text-dim)", cursor: "grab", userSelect: "none", fontSize: 15, flexShrink: 0 }}>⠿</span>
                        <ChampionInput
                          id={`champ-input-${dIdx}-1-${pIdx}`}
                          value={p.champion}
                          onChange={(v) => updateDraftChampion(dIdx, 1, pIdx, v)}
                        />
                        <input
                          type="text"
                          value={p.nickname}
                          onChange={(e) => updateDraftNickname(dIdx, 1, pIdx, e.target.value)}
                          className="w-1/2 px-2 py-1 text-sm rounded outline-none"
                          style={{ background: "var(--hover)", border: "1px solid var(--border)", color: "var(--text)" }}
                          placeholder="닉네임"
                        />
                      </div>
                    ))}

                    {/* 블루팀 밴 입력란 */}
                    <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                      <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-dim)" }}>🚫 블루팀 밴</div>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, bIdx) => (
                          <ChampionInput
                            key={bIdx}
                            id={`ban-input-${dIdx}-1-${bIdx}`}
                            value={draft.result.bans?.team1?.[bIdx] || ""}
                            onChange={(v) => updateDraftBan(dIdx, 1, bIdx, v)}
                            className="w-1/5"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 레드 진영 렌더링 */}
                <div>
                  <div className="text-sm font-bold mb-3 border-b pb-1 flex items-center gap-2" style={{ color: "var(--loss)", borderColor: "var(--border)" }}>
                    🔴 레드 진영
                    {canonicalTeam1Nicks.size > 0 && (
                      <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                        ({dIdx === 0 || !teamAOnRed ? "팀 B" : "팀 A"})
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {draft.result.team2.map((p, pIdx) => (
                      <div key={pIdx}
                        className="flex gap-2 items-center rounded"
                        draggable
                        onDragStart={() => setDragging({ gIndex: dIdx, team: 2, pIndex: pIdx })}
                        onDragOver={e => { e.preventDefault(); setDragOver({ gIndex: dIdx, team: 2, pIndex: pIdx }); }}
                        onDrop={() => {
                          if (dragging?.gIndex === dIdx && dragging?.team === 2) reorderDraftPlayer(dIdx, 2, dragging.pIndex, pIdx);
                          setDragging(null); setDragOver(null);
                        }}
                        onDragEnd={() => { setDragging(null); setDragOver(null); }}
                        style={{
                          opacity: dragging?.gIndex === dIdx && dragging?.team === 2 && dragging?.pIndex === pIdx ? 0.35 : 1,
                          outline: dragOver?.gIndex === dIdx && dragOver?.team === 2 && dragOver?.pIndex === pIdx ? "2px dashed var(--accent)" : "none",
                          borderRadius: 6, padding: "1px",
                        }}
                      >
                        <span title="드래그로 순서 변경" style={{ color: "var(--text-dim)", cursor: "grab", userSelect: "none", fontSize: 15, flexShrink: 0 }}>⠿</span>
                        <ChampionInput
                          id={`champ-input-${dIdx}-2-${pIdx}`}
                          value={p.champion}
                          onChange={(v) => updateDraftChampion(dIdx, 2, pIdx, v)}
                        />
                        <input
                          type="text"
                          value={p.nickname}
                          onChange={(e) => updateDraftNickname(dIdx, 2, pIdx, e.target.value)}
                          className="w-1/2 px-2 py-1 text-sm rounded outline-none"
                          style={{ background: "var(--hover)", border: "1px solid var(--border)", color: "var(--text)" }}
                          placeholder="닉네임"
                        />
                      </div>
                    ))}

                    {/* 레드팀 밴 입력란 */}
                    <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                      <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-dim)" }}>🚫 레드팀 밴</div>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, bIdx) => (
                          <ChampionInput
                            key={bIdx}
                            id={`ban-input-${dIdx}-2-${bIdx}`}
                            value={draft.result.bans?.team2?.[bIdx] || ""}
                            onChange={(v) => updateDraftBan(dIdx, 2, bIdx, v)}
                            className="w-1/5"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}

          {/* 최종 저장 액션 */}
          <div className="flex justify-center pt-4">
            <button
              onClick={confirmAndSave}
              className="px-10 py-4 rounded font-bold text-lg transition-all"
              style={{
                background: "var(--accent)", color: "var(--panel-alt)",
                boxShadow: "0 4px 14px rgba(82,216,90,0.3)"
              }}
            >
              ✅ 이상 없습니다. 최종 검수 완료 및 랭킹 저장!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
