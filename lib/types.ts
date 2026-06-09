export interface PlayerGameData {
  nickname: string;
  position?: string; // 탑 | 정글 | 미드 | 원딜 | 서포터 (필요 시 선택)
  champion: string;
  kills?: number;
  deaths?: number;
  assists?: number;
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
  summary?: string;   // AI 혹은 수동 요약
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
}
