export interface PlayerGameData {
  nickname: string;
  position?: string; // 탑 | 정글 | 미드 | 원딜 | 서포터 (필요 시 선택)
  champion: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  damageDealt?: number; // 챔피언에게 가한 피해량 (절댓값) - DMG%, 딜량 그래프에 사용
  damageTaken?: number; // 적에게 받은 피해량 (절댓값) - DT%에 사용
  visionScore?: number; // 시야 점수
  cs?: number; // CS (미니언 처치 수)
  controlWardsBought?: number; // 제어와드 구매 개수 (MVP/에이스 평가에 사용)
}

export interface GameRecord {
  id: string;
  date: string;       // "YYYY-MM-DD"
  gameFormat: "3판2선" | "5판3선";
  gameNumber: number; // 시리즈 내 몇 번째 경기
  team1: PlayerGameData[];
  team2: PlayerGameData[];
  winTeam: 1 | 2;
  bans?: { team1: string[]; team2: string[] };
  gameDuration?: number; // 게임 시간 (분, 소수 가능 - 분당 CS 계산용)
  summary?: string;   // AI 혹은 수동 요약
}

export interface NapuPlayerRating {
  nickname: string;
  score: number;  // 1.0 ~ 10.0
}

export interface NapuSeriesRating {
  seriesDate: string;
  generatedAt: string;
  team1Wins: number;
  team2Wins: number;
  team1Players: string[];  // nicknames in position order
  team2Players: string[];
  ratings: NapuPlayerRating[];
}

export interface LimitedTitle {
  id: string;
  holder: string;   // display nickname (main nickname)
  date: string;     // YYYY-MM-DD when first achieved
}

export interface SeasonTrophy {
  season: string;       // "2025-Q1"
  seasonLabel: string;  // "2025년 1분기"
  rank: 1 | 2 | 3;
}

export interface SeasonDef {
  id: string;           // UUID
  label: string;        // 관리자가 직접 입력한 시즌 이름
  startDate: string;    // "YYYY-MM-DD"
  endDate?: string;     // "YYYY-MM-DD" — 없으면 진행중
  closed: boolean;
  winners?: { rank1?: string; rank2?: string; rank3?: string; };
}

export interface NicknameEntry {
  id: string;
  nickname: string;
  altNicknames?: string[];
  realName: string;
  tier: string;
  tierDiv?: string;
  lp?: string;
  roles: string[];
  representativeBadge?: string;
  equippedLimitedTitle?: string;
  trophies?: SeasonTrophy[];
}

export type BadgeGrade = "일반" | "희귀" | "영웅" | "전설" | "신화";

export interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  color: string;
  grade: BadgeGrade;
}

export interface PlayerStats {
  nickname: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;          // 0~1
  score: number;            // wins*3 - losses*1
  currentStreak: number;    // 양수=연승, 음수=연패
  maxWinStreak: number;
  maxLoseStreak: number;
  topChampions: { name: string; wins: number; losses: number; games: number }[];
  championStats: Record<string, { wins: number; losses: number; games: number; kills?: number; deaths?: number; assists?: number }>;
  kdaTotal?: { kills: number; deaths: number; assists: number; games: number };
  positionStats?: Record<string, { wins: number; losses: number; games: number }>;
  vsStats: Record<string, { wins: number; losses: number }>;   // 적팀에 있을 때
  withStats: Record<string, { wins: number; losses: number }>; // 같은 팀일 때
  badges: Badge[];
  honeyChamps?: Set<string>;
  champBanCounts?: Record<string, number>;
  mvpCount?: number;
  aceCount?: number;
}
