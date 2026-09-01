export interface LimitedTitleDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: string;
  color: string;
  accentColor: string;
}

export const LIMITED_TITLE_DEFS: LimitedTitleDef[] = [
  {
    id: "pioneer_streak",
    name: "연승의 개척자",
    icon: "🔰",
    description: "이 그룹 최초로 5연승을 달성한 자",
    condition: "최초 5연승 달성",
    color: "#f59e0b",
    accentColor: "#7c3aed",
  },
  {
    id: "pioneer_score",
    name: "황금기의 선각자",
    icon: "🔑",
    description: "이 그룹 최초로 점수 40점을 달성한 자 — 새로운 시대의 문을 먼저 열었다",
    condition: "최초 점수 40점",
    color: "#ef4444",
    accentColor: "#7c3aed",
  },
  {
    id: "pioneer_kda",
    name: "처형자",
    icon: "☠️",
    description: "이 그룹 최초로 평균 KDA 5.0 이상을 달성한 자 (10경기 이상 기준)",
    condition: "최초 평균 KDA 5.0 (10경기+)",
    color: "#dc2626",
    accentColor: "#7c3aed",
  },
  {
    id: "pioneer_mvp",
    name: "천부의 캐리",
    icon: "🐉",
    description: "이 그룹 최초로 MVP를 15회 달성한 자 — 언제나 팀이 기억할 이름",
    condition: "최초 MVP 15회 달성",
    color: "#f59e0b",
    accentColor: "#ef4444",
  },
  {
    id: "pioneer_ace",
    name: "불패의 에이스",
    icon: "🩸",
    description: "이 그룹 최초로 ACE를 10회 달성한 자 — 질 때도 홀로 빛났다",
    condition: "최초 ACE 10회 달성",
    color: "#7c3aed",
    accentColor: "#dc2626",
  },
  {
    id: "pioneer_champ",
    name: "무한 전사",
    icon: "🌀",
    description: "이 그룹 최초로 45종류 이상의 챔피언을 플레이한 자 — 모든 전장, 모든 역할을 섭렵했다",
    condition: "최초 45종류 챔피언 플레이",
    color: "#06b6d4",
    accentColor: "#8b5cf6",
  },
  {
    id: "pioneer_meta",
    name: "내가 곧 메타다",
    icon: "♟️",
    description: "이 그룹 최초로 자신만이 픽한 챔피언 3종을 1티어로 만든 자 — 내가 픽하면 강챔이 된다",
    condition: "1인픽 챔피언 3종 · 각 3경기+ · 승률 60%+",
    color: "#22c55e",
    accentColor: "#f59e0b",
  },
  {
    id: "pioneer_champ_master",
    name: "불굴의 장인",
    icon: "⚒️",
    description: "이 그룹 최초로 동일 챔피언으로 10경기를 소화한 자 — 한 길을 끝까지 파고들었다",
    condition: "동일 챔피언 최초 10경기 달성",
    color: "#f97316",
    accentColor: "#7c3aed",
  },
  {
    id: "pioneer_easter",
    name: "전설의 탐험가",
    icon: "🗝️",
    description: "이 그룹 최초로 마을에 숨겨진 4개의 비밀을 모두 발견한 자 — 마을의 모든 그림자 뒤를 들여다보았다",
    condition: "비밀 테마 4종 해금 (이스터에그)",
    color: "#8b5cf6",
    accentColor: "#f59e0b",
  },
];

export function getLimitedTitleDef(id: string): LimitedTitleDef | undefined {
  return LIMITED_TITLE_DEFS.find(d => d.id === id);
}
