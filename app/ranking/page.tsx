"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  computePlayerStats,
  computeAggregatedStats,
  loadGameRecords,
  loadNicknames,
  saveNicknames,
  getAllNicknames,
  normalizeId,
  formatWinRate,
} from "@/lib/stats";
import type { PlayerStats, NicknameEntry, BadgeGrade, GameRecord, SeasonDef, Badge, LimitedTitle } from "@/lib/types";
import GuideBanner from "@/components/GuideBanner";
import { TrophyList } from "@/components/TrophyBadge";
import { LimitedTitleBadge } from "@/components/LimitedTitleBadge";
import { LIMITED_TITLE_DEFS, getLimitedTitleDef } from "@/lib/limitedTitles";

type RankedPerson = PlayerStats & {
  displayName: string;
  nicknames: string[];
  mainNickname: string;
  hasAlts: boolean;
};

// ─── 업적 전체 정의 (모달에서 사용) ────────────────────────────────────────
const ALL_BADGE_DEFS: { id: string; icon: string; name: string; hint: string; color: string; grade: BadgeGrade }[] = [
  { id: "first",         icon: "🌱", name: "첫 걸음",        hint: "첫 경기에 참여하면 획득",                      color: "#66bb6a", grade: "일반" },
  { id: "flow",          icon: "🌊", name: "흐름을 타다",     hint: "최고 연승 3회 이상 달성",                      color: "#29b6f6", grade: "희귀" },
  { id: "fire",          icon: "🔥", name: "불꽃전사",        hint: "최고 연승 5회 이상 달성",                      color: "#ef5350", grade: "희귀" },
  { id: "ace",           icon: "⭐", name: "신예 에이스",     hint: "10경기 이상 + 승률 60% 이상",                  color: "#ffa726", grade: "희귀" },
  { id: "steady",        icon: "📊", name: "착실하게",         hint: "시리즈 10경기 이상 참여",                      color: "#78909c", grade: "일반" },
  { id: "diamond",       icon: "💎", name: "베테랑 닌자",     hint: "시리즈 20경기 이상 참여",                      color: "#6080c8", grade: "희귀" },
  { id: "scoreRich",     icon: "💰", name: "승점 부자",        hint: "점수 20점 이상 달성",                          color: "#f9a825", grade: "희귀" },
  { id: "unlucky",       icon: "😵", name: "끝없는 불운",      hint: "최고 연패 5회 이상 기록",                      color: "#546e7a", grade: "희귀" },
  { id: "explorer",      icon: "🎭", name: "챔피언 탐험가",    hint: "5종류 이상의 챔피언 플레이",                   color: "#ab47bc", grade: "일반" },
  { id: "versatile",     icon: "🎨", name: "다재다능",          hint: "10종류 이상의 챔피언 플레이",                 color: "#7c4dff", grade: "희귀" },
  { id: "champMaster",   icon: "🗡️", name: "원챔 장인",       hint: "특정 챔피언 5경기 이상 플레이",                color: "#ff7043", grade: "희귀" },
  { id: "revenge",       icon: "💢", name: "앙갚음",           hint: "특정 상대에게 3승 이상",                       color: "#f44336", grade: "희귀" },
  { id: "lion",          icon: "🦁", name: "천적 파괴자",      hint: "특정 상대에게 5승 이상",                       color: "#ef8050", grade: "희귀" },
  { id: "nemesis",       icon: "😤", name: "철천지원수",        hint: "특정 상대에게 5패 이상 당함",                 color: "#ab47bc", grade: "희귀" },
  { id: "regularRival",  icon: "🤺", name: "단골 맞대결",      hint: "특정 상대와 5번 이상 맞대결",                  color: "#5c6bc0", grade: "희귀" },
  { id: "pillar",        icon: "🏛️", name: "팀의 기둥",        hint: "특정 파트너와 10경기 이상 함께 출전",          color: "#26a69a", grade: "희귀" },
  { id: "unstoppable",   icon: "♾️", name: "무적의 닌자",     hint: "최고 연승 6회 이상 달성",                      color: "#f0d080", grade: "영웅" },
  { id: "crown",         icon: "👑", name: "승률왕",           hint: "20경기 이상 + 승률 70% 이상",                 color: "#c8a951", grade: "영웅" },
  { id: "veteran",       icon: "🏠", name: "내전의 터줏대감",  hint: "시리즈 30경기 이상 참여",                      color: "#546e7a", grade: "영웅" },
  { id: "champExpert",   icon: "🏹", name: "장인의 경지",      hint: "특정 챔피언 10경기 이상 + 승률 60% 이상",      color: "#e53935", grade: "영웅" },
  { id: "manyFaces",     icon: "🃏", name: "천의 얼굴",        hint: "20종류 이상의 챔피언 플레이",                  color: "#e91e63", grade: "영웅" },
  { id: "scoreMaster",   icon: "🎖️", name: "점수의 지배자",   hint: "점수 25점 이상 달성",                          color: "#ffd600", grade: "영웅" },
  { id: "comeback",      icon: "💪", name: "칠전팔기",          hint: "연패 3 이상 기록 후 최종 승률 50% 이상",      color: "#ef5350", grade: "영웅" },
  { id: "rival",         icon: "⚡", name: "숙명의 라이벌",    hint: "특정 상대와 10번 이상 맞대결",                 color: "#7e57c2", grade: "영웅" },
  { id: "buddy",         icon: "🤜", name: "찰떡 콤비",         hint: "특정 파트너와 5경기 이상 + 승률 70% 이상",   color: "#50a0d0", grade: "영웅" },
  { id: "longPartner",   icon: "🤝", name: "찰떡 파트너",      hint: "특정 파트너와 15경기 이상 함께 출전",          color: "#26c6da", grade: "영웅" },
  { id: "ruthless",      icon: "⚔️", name: "무자비한 닌자",   hint: "3명 이상의 상대에게 각각 5승 이상",            color: "#d32f2f", grade: "영웅" },
  { id: "jgSup",         icon: "🌙", name: "밤의 사냥꾼",      hint: "정글-서포터 콤비로 5승 이상",                  color: "#5c6bc0", grade: "영웅" },
  { id: "adcSup",        icon: "🎯", name: "무적의 바텀듀오",  hint: "원딜-서포터 콤비로 5승 이상",                  color: "#f06292", grade: "영웅" },
  { id: "topMid",        icon: "🏔️", name: "무적의 상체",     hint: "탑-미드 콤비로 5승 이상",                      color: "#8d6e63", grade: "영웅" },
  { id: "legend",        icon: "🌟", name: "전설의 닌자",      hint: "25경기 이상 + 승률 70% 이상",                 color: "#ff6f00", grade: "전설" },
  { id: "champLegend",   icon: "⚜️", name: "챔피언 달인",      hint: "특정 챔피언 15경기 이상 + 승률 70% 이상",      color: "#ff4081", grade: "전설" },
  { id: "scoreKing",     icon: "🏆", name: "점수 제왕",         hint: "점수 35점 이상 달성",                         color: "#ff6f00", grade: "전설" },
  { id: "destroyer",     icon: "👹", name: "파괴신",            hint: "최고 연승 10회 이상 달성",                    color: "#c62828", grade: "전설" },
  { id: "eternalPartner",icon: "✨", name: "영원한 동반자",     hint: "특정 파트너와 25경기 이상 함께 출전",          color: "#4a148c", grade: "전설" },
  { id: "eternalRival",  icon: "🔮", name: "영원한 숙적",       hint: "특정 상대와 15번 이상 맞대결",                color: "#1a237e", grade: "전설" },
  { id: "guardian",        icon: "🌿", name: "나뭇잎의 수호자",  hint: "시리즈 40경기 이상 참여",            color: "#00e5ff", grade: "신화" },
  { id: "champOmniscient", icon: "🎓", name: "챔피언 전집",      hint: "45종류 이상의 챔피언 플레이",          color: "#a855f7", grade: "신화" },
  { id: "mvpGod",          icon: "🔱", name: "MVP의 신",          hint: "MVP 20회 이상 달성",                   color: "#f59e0b", grade: "신화" },
  { id: "mvpMachine",      icon: "🏅", name: "MVP 머신",          hint: "MVP 10회 이상 달성",                   color: "#f59e0b", grade: "전설" },
  { id: "aceLegend",       icon: "💜", name: "ACE의 저주",        hint: "ACE 10회 이상 달성",                   color: "#7c3aed", grade: "전설" },
  { id: "mvpHabit",        icon: "🌠", name: "MVP 상습범",        hint: "MVP 5회 이상 달성",                    color: "#f59e0b", grade: "영웅" },
  { id: "aceSpirit",       icon: "💥", name: "불굴의 용사",       hint: "ACE 5회 이상 달성",                    color: "#7c3aed", grade: "영웅" },
  { id: "mvpFirst",        icon: "🥇", name: "첫 MVP",            hint: "MVP 1회 이상 달성",                    color: "#f59e0b", grade: "희귀" },
  { id: "aceFirst",        icon: "🕯️", name: "패배 속의 빛",     hint: "ACE 1회 이상 달성 (패배팀 최고 기여)", color: "#7c3aed", grade: "희귀" },
  { id: "bladeWhisper",  icon: "🔪", name: "칼날의 속삭임",   hint: "KDA 5판 이상 기록 · 평균 KDA 5.0 이상",         color: "#e91e63", grade: "희귀" },
  { id: "immortal",      icon: "🛡️", name: "죽지 않는 닌자",  hint: "KDA 5판 이상 기록 · 평균 데스 1.5 이하",        color: "#7c4dff", grade: "희귀" },
  { id: "honeyFinder",   icon: "🍯", name: "꿀챔 발굴자",     hint: "꿀챔 판정 챔피언으로 5판 이상 + 승률 50%+",     color: "#f59e0b", grade: "희귀" },
  { id: "publicEnemy",   icon: "⚠️", name: "공공의 적",        hint: "내 모스트 챔피언이 내전에서 3회 이상 밴당함",    color: "#f97316", grade: "희귀" },
  { id: "slayer",        icon: "💀", name: "학살자",            hint: "KDA 5판 이상 기록 · 평균 KDA 10.0 이상",        color: "#c62828", grade: "영웅" },
  { id: "battleDominator", icon: "💫", name: "전장의 지배자",   hint: "KDA 5판 이상 기록 · 평균 KDA 7.0 이상",         color: "#ba68c8", grade: "영웅" },
  { id: "honeyProphet",  icon: "🌾", name: "꿀챔 전도사",      hint: "꿀챔 판정 챔피언으로 10판 이상 플레이",          color: "#22c55e", grade: "영웅" },
  { id: "champCollector",icon: "🎪", name: "챔피언 수집가",    hint: "30종류 이상의 챔피언 플레이",                    color: "#ff6f00", grade: "전설" },
];

const GRADE_STYLE: Record<BadgeGrade, { label: string; color: string; bg: string }> = {
  일반: { label: "일반", color: "#78909c", bg: "#78909c22" },
  희귀: { label: "희귀", color: "#42a5f5", bg: "#42a5f522" },
  영웅: { label: "영웅", color: "#ab47bc", bg: "#ab47bc22" },
  전설: { label: "전설", color: "#ff8f00", bg: "#ff8f0022" },
  신화: { label: "신화", color: "#00e5ff", bg: "#00e5ff22" },
};

const GRADE_ORDER: BadgeGrade[] = ["신화", "전설", "영웅", "희귀", "일반"];

// ─── 업적 진행도 계산 ─────────────────────────────────────────────────────────
type ProgressInfo = { current: number; target: number; label: string };

function getBadgeProgress(id: string, p: RankedPerson): ProgressInfo | null {
  const vs = p.vsStats || {};
  const w = p.withStats || {};
  const cs = p.championStats || {};
  const champEntries = Object.entries(cs).filter(([n]) => n !== "?");
  const uniqueChamps = champEntries.length;
  const bestChampGames = champEntries.reduce((m, [, v]) => Math.max(m, v.games), 0);
  const bestVsWins   = Object.values(vs).reduce((m, v) => Math.max(m, v.wins), 0);
  const bestVsLosses = Object.values(vs).reduce((m, v) => Math.max(m, v.losses), 0);
  const bestVsTotal  = Object.values(vs).reduce((m, v) => Math.max(m, v.wins + v.losses), 0);
  const bestWithTotal = Object.values(w).reduce((m, v) => Math.max(m, v.wins + v.losses), 0);
  const dominatedCount  = Object.values(vs).filter(v => v.wins >= 5).length;
  const closeAlliesCount = Object.values(w).filter(v => v.wins + v.losses >= 5).length;
  const wr = Math.round(p.winRate * 100);

  switch (id) {
    case "first":         return { current: Math.min(p.totalGames, 1), target: 1,  label: "1경기 참여" };
    case "flow":          return { current: p.maxWinStreak, target: 3,  label: `최고 연승 ${p.maxWinStreak}회` };
    case "fire":          return { current: p.maxWinStreak, target: 5,  label: `최고 연승 ${p.maxWinStreak}회` };
    case "unstoppable":   return { current: p.maxWinStreak, target: 6,  label: `최고 연승 ${p.maxWinStreak}회` };
    case "destroyer":     return { current: p.maxWinStreak, target: 10, label: `최고 연승 ${p.maxWinStreak}회` };
    case "ace":
      if (p.totalGames < 10) return { current: p.totalGames, target: 10, label: `${p.totalGames}/10경기` };
      return { current: wr, target: 60, label: `승률 ${wr}%` };
    case "crown":
      if (p.totalGames < 20) return { current: p.totalGames, target: 20, label: `${p.totalGames}/20경기` };
      return { current: wr, target: 70, label: `승률 ${wr}%` };
    case "legend":
      if (p.totalGames < 25) return { current: p.totalGames, target: 25, label: `${p.totalGames}/25경기` };
      return { current: wr, target: 70, label: `승률 ${wr}%` };
    case "steady":        return { current: p.totalGames, target: 10, label: `${p.totalGames}/10경기` };
    case "diamond":       return { current: p.totalGames, target: 20, label: `${p.totalGames}/20경기` };
    case "veteran":       return { current: p.totalGames, target: 30, label: `${p.totalGames}/30경기` };
    case "guardian":      return { current: p.totalGames, target: 40, label: `${p.totalGames}/40경기` };
    case "explorer":      return { current: uniqueChamps, target: 5,  label: `${uniqueChamps}종류` };
    case "versatile":     return { current: uniqueChamps, target: 10, label: `${uniqueChamps}종류` };
    case "manyFaces":     return { current: uniqueChamps, target: 20, label: `${uniqueChamps}종류` };
    case "champMaster":   return { current: bestChampGames, target: 5,  label: `최다 챔피언 ${bestChampGames}경기` };
    case "champExpert":   return { current: bestChampGames, target: 10, label: `최다 챔피언 ${bestChampGames}경기` };
    case "champLegend":   return { current: bestChampGames, target: 15, label: `최다 챔피언 ${bestChampGames}경기` };
    case "scoreRich":     return { current: Math.max(0, p.score), target: 20, label: `현재 ${p.score}점` };
    case "scoreMaster":   return { current: Math.max(0, p.score), target: 25, label: `현재 ${p.score}점` };
    case "scoreKing":     return { current: Math.max(0, p.score), target: 35, label: `현재 ${p.score}점` };
    case "unlucky":       return { current: p.maxLoseStreak, target: 5, label: `최고 연패 ${p.maxLoseStreak}회` };
    case "comeback":
      if (p.maxLoseStreak < 3) return { current: p.maxLoseStreak, target: 3, label: `최고 연패 ${p.maxLoseStreak}회` };
      if (p.totalGames < 10)   return { current: p.totalGames, target: 10, label: `${p.totalGames}/10경기` };
      return { current: wr, target: 50, label: `승률 ${wr}%` };
    case "revenge":       return { current: bestVsWins,   target: 3,  label: `최다 상대승 ${bestVsWins}승` };
    case "lion":          return { current: bestVsWins,   target: 5,  label: `최다 상대승 ${bestVsWins}승` };
    case "nemesis":       return { current: bestVsLosses, target: 5,  label: `최다 상대패 ${bestVsLosses}패` };
    case "regularRival":  return { current: bestVsTotal,  target: 5,  label: `최다 맞대결 ${bestVsTotal}번` };
    case "rival":         return { current: bestVsTotal,  target: 10, label: `최다 맞대결 ${bestVsTotal}번` };
    case "eternalRival":  return { current: bestVsTotal,  target: 15, label: `최다 맞대결 ${bestVsTotal}번` };
    case "buddy":         return { current: Math.min(bestWithTotal, 5), target: 5,  label: `파트너 최다 ${bestWithTotal}경기` };
    case "pillar":        return { current: bestWithTotal, target: 10, label: `파트너 최다 ${bestWithTotal}경기` };
    case "longPartner":   return { current: bestWithTotal, target: 15, label: `파트너 최다 ${bestWithTotal}경기` };
    case "eternalPartner":return { current: bestWithTotal, target: 25, label: `파트너 최다 ${bestWithTotal}경기` };
    case "ruthless":      return { current: dominatedCount, target: 3, label: `${dominatedCount}명에게 5승+` };
    case "champCollector":    return { current: uniqueChamps, target: 30, label: `${uniqueChamps}/30종류` };
    case "champOmniscient":   return { current: uniqueChamps, target: 45, label: `${uniqueChamps}/45종류` };
    case "mvpFirst":   return { current: Math.min(p.mvpCount ?? 0, 1),  target: 1,  label: `MVP ${p.mvpCount ?? 0}회` };
    case "mvpHabit":   return { current: Math.min(p.mvpCount ?? 0, 5),  target: 5,  label: `MVP ${p.mvpCount ?? 0}회` };
    case "mvpMachine": return { current: Math.min(p.mvpCount ?? 0, 10), target: 10, label: `MVP ${p.mvpCount ?? 0}회` };
    case "mvpGod":     return { current: Math.min(p.mvpCount ?? 0, 20), target: 20, label: `MVP ${p.mvpCount ?? 0}회` };
    case "aceFirst":   return { current: Math.min(p.aceCount ?? 0, 1),  target: 1,  label: `ACE ${p.aceCount ?? 0}회` };
    case "aceSpirit":  return { current: Math.min(p.aceCount ?? 0, 5),  target: 5,  label: `ACE ${p.aceCount ?? 0}회` };
    case "aceLegend":  return { current: Math.min(p.aceCount ?? 0, 10), target: 10, label: `ACE ${p.aceCount ?? 0}회` };
    case "bladeWhisper": {
      if (!p.kdaTotal || p.kdaTotal.games < 5) return { current: p.kdaTotal?.games ?? 0, target: 5, label: `KDA 기록 ${p.kdaTotal?.games ?? 0}판` };
      const kda = p.kdaTotal.deaths > 0 ? (p.kdaTotal.kills + p.kdaTotal.assists) / p.kdaTotal.deaths : 999;
      return { current: Math.min(kda, 5), target: 5, label: `현재 KDA ${kda >= 999 ? "Perfect" : kda.toFixed(2)}` };
    }
    case "slayer": {
      if (!p.kdaTotal || p.kdaTotal.games < 5) return { current: p.kdaTotal?.games ?? 0, target: 5, label: `KDA 기록 ${p.kdaTotal?.games ?? 0}판` };
      const kda = p.kdaTotal.deaths > 0 ? (p.kdaTotal.kills + p.kdaTotal.assists) / p.kdaTotal.deaths : 999;
      return { current: Math.min(kda, 10), target: 10, label: `현재 KDA ${kda >= 999 ? "Perfect" : kda.toFixed(2)}` };
    }
    case "battleDominator": {
      if (!p.kdaTotal || p.kdaTotal.games < 5) return { current: p.kdaTotal?.games ?? 0, target: 5, label: `KDA 기록 ${p.kdaTotal?.games ?? 0}판` };
      const kda = p.kdaTotal.deaths > 0 ? (p.kdaTotal.kills + p.kdaTotal.assists) / p.kdaTotal.deaths : 999;
      return { current: Math.min(kda, 7), target: 7, label: `현재 KDA ${kda >= 999 ? "Perfect" : kda.toFixed(2)}` };
    }
    case "immortal": {
      if (!p.kdaTotal || p.kdaTotal.games < 5) return { current: p.kdaTotal?.games ?? 0, target: 5, label: `KDA 기록 ${p.kdaTotal?.games ?? 0}판` };
      const avgD = p.kdaTotal.deaths / p.kdaTotal.games;
      return { current: 1.5, target: avgD, label: `평균 데스 ${avgD.toFixed(1)}회` };
    }
    case "honeyFinder": {
      if (!p.honeyChamps || p.honeyChamps.size === 0) return { current: 0, target: 5, label: "꿀챔 플레이 없음" };
      const honeyEntries = champEntries.filter(([name]) => p.honeyChamps!.has(name));
      if (honeyEntries.length === 0) return { current: 0, target: 5, label: "꿀챔 플레이 없음" };
      const bestHoney = honeyEntries.sort((a, b) => b[1].games - a[1].games)[0];
      const wr = bestHoney[1].wins / bestHoney[1].games;
      if (bestHoney[1].games < 5) return { current: bestHoney[1].games, target: 5, label: `${bestHoney[0]} ${bestHoney[1].games}판` };
      return { current: Math.round(wr * 100), target: 50, label: `${bestHoney[0]} 승률 ${Math.round(wr * 100)}%` };
    }
    case "publicEnemy": {
      if (!p.champBanCounts || champEntries.length === 0) return { current: 0, target: 3, label: "밴 횟수 0회" };
      const mostPlayed = [...champEntries].sort((a, b) => b[1].games - a[1].games)[0];
      const banCount = p.champBanCounts[mostPlayed[0]] || 0;
      return { current: banCount, target: 3, label: `${mostPlayed[0]} 밴 ${banCount}회` };
    }
    case "honeyProphet": {
      if (!p.honeyChamps || p.honeyChamps.size === 0) return { current: 0, target: 10, label: "꿀챔 플레이 없음" };
      const honeyEntries = champEntries.filter(([name]) => p.honeyChamps!.has(name));
      if (honeyEntries.length === 0) return { current: 0, target: 10, label: "꿀챔 플레이 없음" };
      const bestHoney = honeyEntries.sort((a, b) => b[1].games - a[1].games)[0];
      return { current: bestHoney[1].games, target: 10, label: `${bestHoney[0]} ${bestHoney[1].games}판` };
    }
    default:              return null;
  }
}

// ─── 리미티드 업적 달성률 계산 ───────────────────────────────────────────────
function getLimitedTitleProgress(id: string, p: RankedPerson): ProgressInfo | null {
  switch (id) {
    case "pioneer_streak":
      return { current: p.maxWinStreak, target: 5, label: `최고 연승 ${p.maxWinStreak}회` };
    case "pioneer_score":
      return { current: Math.max(0, p.score), target: 40, label: `현재 ${p.score}점` };
    case "pioneer_kda": {
      if (!p.kdaTotal || p.kdaTotal.games < 10)
        return { current: p.kdaTotal?.games ?? 0, target: 10, label: `KDA 기록 ${p.kdaTotal?.games ?? 0}판` };
      const kda = p.kdaTotal.deaths > 0
        ? (p.kdaTotal.kills + p.kdaTotal.assists) / p.kdaTotal.deaths
        : 999;
      return { current: Math.min(kda, 5), target: 5, label: `평균 KDA ${kda >= 999 ? "Perfect" : kda.toFixed(2)}` };
    }
    case "pioneer_mvp":
      return { current: p.mvpCount ?? 0, target: 15, label: `MVP ${p.mvpCount ?? 0}회` };
    case "pioneer_ace":
      return { current: p.aceCount ?? 0, target: 10, label: `ACE ${p.aceCount ?? 0}회` };
    case "pioneer_champ": {
      const uniqueChamps = Object.keys(p.championStats || {}).filter(n => n !== "?").length;
      return { current: uniqueChamps, target: 45, label: `${uniqueChamps}종류 플레이` };
    }
    case "pioneer_champ_master": {
      const cs = p.championStats || {};
      const entries = Object.entries(cs).filter(([n]) => n !== "?");
      const best = entries.sort((a, b) => b[1].games - a[1].games)[0];
      const maxGames = best ? best[1].games : 0;
      return { current: Math.min(maxGames, 10), target: 10, label: best ? `${best[0]} ${maxGames}경기` : "0경기" };
    }
    case "pioneer_meta": {
      const cs = p.championStats || {};
      const highWrCount = Object.entries(cs)
        .filter(([n]) => n !== "?")
        .filter(([, v]) => v.games >= 3 && v.wins / v.games >= 0.6)
        .length;
      return { current: Math.min(highWrCount, 3), target: 3, label: `고승률 1인픽 후보 ${highWrCount}개` };
    }
    default:
      return null;
  }
}

// ─── 대표업적 모달 ────────────────────────────────────────────────────────────
function BadgeModal({
  person,
  repBadgeId,
  onSet,
  onClose,
  allLimitedTitles,
  equippedTitleId,
  onEquip,
}: {
  person: RankedPerson;
  repBadgeId: string | undefined;
  onSet: (badgeId: string) => void;
  onClose: () => void;
  allLimitedTitles: LimitedTitle[];
  equippedTitleId: string | undefined;
  onEquip: (titleId: string) => void;
}) {
  const [tab, setTab] = useState<"badges" | "limited">("badges");
  const earnedMap = new Map(person.badges.map(b => [b.id, b]));
  const earnedCount = person.badges.length;
  const myLimitedIds = new Set(allLimitedTitles.filter(t => t.holder === person.mainNickname).map(t => t.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}>
      <div className="w-full mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 520, maxHeight: "85vh", background: "var(--panel)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="font-bold text-base" style={{ color: "var(--text)" }}>
              {person.displayName}의 업적
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              달성 {earnedCount} / 전체 {ALL_BADGE_DEFS.length} · 일반 업적 또는 리미티드 업적 중 하나만 장착 가능
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-lg"
            style={{ background: "var(--hover)", color: "var(--text-muted)" }}>✕</button>
        </div>

        {/* 탭 */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          {([["badges", "🏅 업적"], ["limited", "🏆 리미티드 업적"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors"
              style={{
                color: tab === id ? "var(--accent)" : "var(--text-muted)",
                borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
                background: "none",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── 업적 탭 ── */}
        {tab === "badges" && (
          <>
            {/* 대표업적 미리보기 */}
            {repBadgeId && earnedMap.has(repBadgeId) && (() => {
              const b = earnedMap.get(repBadgeId)!;
              const gs = GRADE_STYLE[b.grade];
              return (
                <div className="mx-5 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 flex-shrink-0"
                  style={{ background: b.color + "18", border: `1px solid ${b.color}55` }}>
                  <span style={{ fontSize: 28 }}>{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: b.color }}>{b.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                        style={{ background: gs.bg, color: gs.color }}>대표</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{b.description}</div>
                  </div>
                  <button onClick={() => onSet(repBadgeId)} className="text-xs px-2 py-1 rounded"
                    style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)", flexShrink: 0 }}>
                    해제
                  </button>
                </div>
              );
            })()}

            {/* 업적 목록 */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {(() => {
                const earnedDefs = ALL_BADGE_DEFS
                  .filter(d => earnedMap.has(d.id))
                  .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));
                const unearnedDefs = ALL_BADGE_DEFS
                  .filter(d => !earnedMap.has(d.id))
                  .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));

                const renderBadge = (def: typeof ALL_BADGE_DEFS[0], earned: boolean) => {
                  const badge = earnedMap.get(def.id);
                  const isRep = def.id === repBadgeId;
                  const gs = GRADE_STYLE[def.grade];
                  return (
                    <div key={def.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{
                        background: earned ? "var(--panel-alt)" : "var(--hover)",
                        border: isRep ? `1px solid ${def.color}88` : "1px solid var(--border)",
                        opacity: earned ? 1 : 0.4,
                        boxShadow: isRep ? `0 0 8px ${def.color}33` : "none",
                      }}>
                      <div className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
                        style={{ background: earned ? def.color + "22" : "var(--border)", filter: earned ? "none" : "grayscale(1)", fontSize: 22 }}>
                        {def.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm" style={{ color: earned ? def.color : "var(--text-muted)" }}>
                            {def.name}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{ background: gs.bg, color: gs.color, border: `1px solid ${gs.color}44` }}>
                            {gs.label}
                          </span>
                          {isRep && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                              style={{ background: def.color + "22", color: def.color }}>★ 대표</span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {earned ? badge!.description : `🔒 ${def.hint}`}
                        </div>
                      </div>
                      {earned ? (
                        <button
                          onClick={() => onSet(def.id)}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-semibold flex-shrink-0"
                          style={{
                            background: isRep ? def.color : "var(--hover)",
                            color: isRep ? "#fff" : "var(--text-muted)",
                            border: isRep ? "none" : "1px solid var(--border)",
                          }}>
                          {isRep ? "대표 ✓" : "대표로"}
                        </button>
                      ) : (() => {
                        const prog = getBadgeProgress(def.id, person);
                        if (!prog) return null;
                        const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));
                        return (
                          <div className="flex-shrink-0 text-right" style={{ width: 64 }}>
                            <div className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>
                              {prog.current} <span style={{ color: "var(--text-dim)" }}>/ {prog.target}</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 3,
                                width: `${pct}%`,
                                background: pct >= 80 ? def.color : pct >= 50 ? def.color + "bb" : def.color + "77",
                                transition: "width 0.3s",
                              }} />
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)", fontSize: 9 }}>{prog.label}</div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                };

                return (
                  <>
                    {earnedDefs.length > 0 && (
                      <>
                        <div className="text-xs font-bold mb-2 mt-1" style={{ color: "var(--accent)" }}>
                          보유 업적 ({earnedDefs.length}개)
                        </div>
                        <div className="space-y-2 mb-5">
                          {earnedDefs.map(d => renderBadge(d, true))}
                        </div>
                      </>
                    )}
                    {unearnedDefs.length > 0 && (
                      <>
                        <div className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                          미달성 업적 ({unearnedDefs.length}개)
                        </div>
                        <div className="space-y-2">
                          {unearnedDefs.map(d => renderBadge(d, false))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}

        {/* ── 리미티드 업적 탭 ── */}
        {tab === "limited" && (
          <div className="overflow-y-auto flex-1 px-5 py-4">
            <div className="text-xs mb-3 px-1" style={{ color: "var(--text-muted)" }}>
              각 리미티드 업적은 그룹 내 최초 달성자 1인이 영구 소유합니다. 장착 시 일반 업적 대표 설정은 해제됩니다.
            </div>
            <div className="space-y-2">
              {LIMITED_TITLE_DEFS.map(def => {
                const titleRecord = allLimitedTitles.find(t => t.id === def.id);
                const isMine = myLimitedIds.has(def.id);
                const isClaimed = !!titleRecord;
                const isEquipped = isMine && equippedTitleId === def.id;

                return (
                  <div key={def.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: isMine ? "var(--panel-alt)" : "var(--hover)",
                      border: isEquipped
                        ? `1.5px solid ${def.color}`
                        : isMine ? `1px solid ${def.color}88` : "1px solid var(--border)",
                      opacity: isClaimed && !isMine ? 0.55 : 1,
                      boxShadow: isEquipped ? `0 0 12px ${def.color}33` : isMine ? `0 0 10px ${def.color}22` : "none",
                    }}>
                    {/* 아이콘 */}
                    <div className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        background: isMine
                          ? `linear-gradient(var(--panel-alt), var(--panel-alt)) padding-box, linear-gradient(135deg, ${def.color}, ${def.accentColor}) border-box`
                          : "var(--border)",
                        border: isMine ? "1.5px solid transparent" : "none",
                        fontSize: 22,
                        filter: !isClaimed ? "grayscale(0.3)" : isMine ? "none" : "grayscale(0.6)",
                      }}>
                      {def.icon}
                    </div>

                    {/* 이름 + 조건 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: isMine ? def.color : "var(--text)" }}>
                          {def.name}
                        </span>
                        {isEquipped && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{ background: def.color + "33", color: def.color, border: `1px solid ${def.color}66` }}>✦ 장착중</span>
                        )}
                        {isMine && !isEquipped && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{ background: def.color + "22", color: def.color }}>내 칭호</span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded font-bold ml-auto"
                          style={{
                            background: isClaimed ? (isMine ? def.color + "22" : "#33333322") : "transparent",
                            color: isClaimed ? (isMine ? def.color : "var(--text-dim)") : "var(--text-dim)",
                            border: "1px solid var(--border)",
                          }}>
                          {isClaimed ? (isMine ? "소유중" : "달성 완료") : "미달성"}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {isClaimed
                          ? `${titleRecord.holder}  · ${titleRecord.date} 달성`
                          : `🔒 ${def.condition}`}
                      </div>
                    </div>

                    {/* 달성률 (미소유자) */}
                    {!isMine && (() => {
                      const prog = getLimitedTitleProgress(def.id, person);
                      if (!prog) return null;
                      const pct = Math.min(100, Math.round((Math.min(prog.current, prog.target) / prog.target) * 100));
                      const display = Number.isFinite(prog.current) && prog.current % 1 !== 0
                        ? (prog.current as number).toFixed(1)
                        : prog.current;
                      return (
                        <div className="flex-shrink-0 text-right" style={{ width: 64 }}>
                          <div className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>
                            {display} <span style={{ color: "var(--text-dim)" }}>/ {prog.target}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 3,
                              width: `${pct}%`,
                              background: isClaimed
                                ? `${def.color}55`
                                : pct >= 80 ? def.color : pct >= 50 ? def.color + "bb" : def.color + "77",
                              transition: "width 0.3s",
                            }} />
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)", fontSize: 9 }}>
                            {isClaimed ? "⚑ 이미 달성됨" : prog.label}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 장착 버튼 */}
                    {isMine && (
                      <button
                        onClick={e => { e.stopPropagation(); onEquip(def.id); }}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-semibold flex-shrink-0"
                        style={{
                          background: isEquipped ? def.color : "var(--hover)",
                          color: isEquipped ? "#fff" : "var(--text-muted)",
                          border: isEquipped ? "none" : "1px solid var(--border)",
                        }}>
                        {isEquipped ? "장착 ✓" : "장착"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 메인 랭킹 페이지 ──────────────────────────────────────────────────────────
export default function RankingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [persons, setPersons] = useState<RankedPerson[]>([]);
  const [nicknameEntries, setNicknameEntries] = useState<NicknameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState<GameRecord[]>([]);
  const [seasons, setSeasons] = useState<SeasonDef[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("all");
  const [badgeModal, setBadgeModal] = useState<RankedPerson | null>(null);
  const [badgeTooltip, setBadgeTooltip] = useState<{ x: number; y: number; badge: Badge } | null>(null);
  const [limitedTooltip, setLimitedTooltip] = useState<{ x: number; y: number; titleId: string } | null>(null);
  const [limitedTitles, setLimitedTitles] = useState<LimitedTitle[]>([]);
  const [newsModalOpen, setNewsModalOpen] = useState(false);

  const [activeTheme, setActiveTheme] = useState<"leaf" | "rain" | "aka" | "sand" | "cloud" | "hideout" | "myoboku" | "anbu" | "orochimaru">("leaf");
  const [baseNewsItems, setBaseNewsItems] = useState<string[]>([]);
  const newsItems = useMemo(() => {
    const items = [...baseNewsItems];
    items.push("🗝️ [秘서] 사용자 가이드 아래로 가면 알려지지 않은 비밀의 서가 있다던데?");
    return items;
  }, [baseNewsItems]);
  const [currentNewsIdx, setCurrentNewsIdx] = useState(0);
  const [anbuUnlocked, setAnbuUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const suffix = session?.user?.id ? `_${session.user.id}` : "_guest";
      setAnbuUnlocked(localStorage.getItem(`theme_unlocked_anbu${suffix}`) === "true");
    }
  }, [session?.user?.id]);

  const handleAnbuUnlock = () => {
    if (typeof window !== "undefined") {
      const suffix = session?.user?.id ? `_${session.user.id}` : "_guest";
      localStorage.setItem(`theme_unlocked_anbu${suffix}`, "true");
      localStorage.setItem("theme", "anbu");
      setAnbuUnlocked(true);
      window.dispatchEvent(new CustomEvent("theme_unlocked"));
      window.dispatchEvent(new CustomEvent("themechange", { detail: "anbu" }));
      window.dispatchEvent(new CustomEvent("show_unlock_modal", {
        detail: {
          id: "anbu",
          name: "암살전술 특수부대",
          icon: "🦊",
          color: "#0891b2",
          desc: "밤하늘의 어둠 속에서 조용히 활약하는 그림자 칼날",
          flavor: "랭킹 페이지 최하단의 숨겨진 그림자를 통해 암살전술 특수부대의 통신을 연동했습니다.\n신분을 감추기 위한 하얀 여우 가면과 청록색 연기, 그리고 고요한 회색조의 사령부 배경이 고독하고도 차가운 밤의 분위기를 자아냅니다."
        }
      }));
    }
  };

  // Observer for HTML theme class changes
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved && ["rain", "aka", "leaf", "sand", "cloud", "hideout", "myoboku", "anbu", "orochimaru"].includes(saved)) {
      setActiveTheme(saved as any);
    }

    const observer = new MutationObserver(() => {
      const html = document.documentElement;
      if (html.classList.contains("aka-mode")) {
        setActiveTheme("aka");
      } else if (html.classList.contains("ame-mode")) {
        setActiveTheme("rain");
      } else if (html.classList.contains("sand-mode")) {
        setActiveTheme("sand");
      } else if (html.classList.contains("cloud-mode")) {
        setActiveTheme("cloud");
      } else if (html.classList.contains("hideout-mode")) {
        setActiveTheme("hideout");
      } else if (html.classList.contains("myoboku-mode")) {
        setActiveTheme("myoboku");
      } else if (html.classList.contains("anbu-mode")) {
        setActiveTheme("anbu");
      } else if (html.classList.contains("orochimaru-mode")) {
        setActiveTheme("orochimaru");
      } else {
        setActiveTheme("leaf");
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // News rotation interval
  useEffect(() => {
    if (newsItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentNewsIdx(idx => (idx + 1) % newsItems.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [newsItems]);

  useEffect(() => {
    Promise.all([
      loadGameRecords(),
      loadNicknames(),
      fetch("/api/seasons").then(r => r.json()).catch(() => [] as SeasonDef[]),
      fetch("/api/limited-titles").then(r => r.json()).catch(() => [] as LimitedTitle[]),
    ]).then(([records, rawEntries, seasonData, titlesData]: [GameRecord[], NicknameEntry[], SeasonDef[], LimitedTitle[]]) => {
      setAllRecords(records);
      setNicknameEntries(rawEntries);
      setSeasons(seasonData);
      setLimitedTitles(Array.isArray(titlesData) ? titlesData : []);

      // 진행중인 시즌이 있으면 그걸 기본값으로
      const today = new Date().toISOString().slice(0, 10);
      const active = seasonData.find(s => !s.closed && s.startDate <= today && (!s.endDate || s.endDate >= today));
      setSelectedSeasonId(active?.id ?? "all");

      if (records.length === 0) {
        setBaseNewsItems(["📢 [안내] 아직 등록된 경기 기록이 없습니다. 먼저 경기를 등록해 주세요!"]);
        setLoading(false);
        return;
      }

      const nicknameToEntry = new Map<string, NicknameEntry>();
      rawEntries.forEach((e: NicknameEntry) => {
        nicknameToEntry.set(normalizeId(e.nickname), e);
        (e.altNicknames || []).forEach((alt) => {
          if (alt.trim()) nicknameToEntry.set(normalizeId(alt.trim()), e);
        });
      });

      const entryGroups = new Map<string, { entry: NicknameEntry; nicks: string[] }>();
      const standaloneNicknames: string[] = [];

      getAllNicknames(records).forEach((nick) => {
        const entry = nicknameToEntry.get(normalizeId(nick));
        if (entry) {
          if (!entryGroups.has(entry.id)) entryGroups.set(entry.id, { entry, nicks: [] });
          entryGroups.get(entry.id)!.nicks.push(nick);
        } else {
          standaloneNicknames.push(nick);
        }
      });

      const result: RankedPerson[] = [];

      entryGroups.forEach(({ entry, nicks }) => {
        const displayName = entry.realName?.trim() || entry.nickname;
        const hasAlts = (entry.altNicknames || []).filter(Boolean).length > 0;
        const stats = nicks.length > 1
          ? computeAggregatedStats(displayName, nicks, records, rawEntries)
          : { ...computePlayerStats(nicks[0], records, rawEntries), nickname: displayName };
        result.push({ ...stats, displayName, nicknames: nicks, mainNickname: entry.nickname, hasAlts });
      });

      standaloneNicknames.forEach((nick) => {
        const stats = computePlayerStats(nick, records, rawEntries);
        result.push({ ...stats, displayName: nick, nicknames: [nick], mainNickname: nick, hasAlts: false });
      });

      result.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.wins - a.wins;
      });

      // Generate news items dynamically (Total 7 items)
      const items: string[] = [];

      // Helper to resolve main nicknames locally
      const resolveMainNickLocal = (nick: string): string => {
        const norm = nick.replace(/\s+/g, "").toLowerCase();
        const entry = rawEntries.find((e: NicknameEntry) =>
          e.nickname.replace(/\s+/g, "").toLowerCase() === norm ||
          (e.altNicknames || []).some((alt: string) => alt.replace(/\s+/g, "").toLowerCase() === norm)
        );
        return entry ? entry.nickname : nick;
      };

      // 1. 1위 닌자 소식
      if (result.length > 0) {
        const topPlayer = result[0];
        items.push(`👑 [${topPlayer.displayName}] 닌자, 승점 ${topPlayer.score}점으로 종합 랭킹 1위를 수성하며 상급닌자 수석 등극!`);
      } else {
        items.push("👑 [안내] 랭킹 1위 자리가 비어 있습니다. 첫 경기를 등록하고 수석 닌자에 도전하세요!");
      }

      // 2. 최근 연승 소식
      const streakPlayers = [...result]
        .filter(p => p.currentStreak >= 2)
        .sort((a, b) => b.currentStreak - a.currentStreak);
      if (streakPlayers.length > 0) {
        const p = streakPlayers[0];
        items.push(`🔥 [${p.displayName}] 닌자, 거침없는 ${p.currentStreak}연승 질주 중! 대기실 전체에 뜨거운 바람을 일으키고 있습니다.`);
      } else {
        const maxStreakPlayers = [...result]
          .filter(p => p.maxWinStreak >= 3)
          .sort((a, b) => b.maxWinStreak - a.maxWinStreak);
        if (maxStreakPlayers.length > 0) {
          const p = maxStreakPlayers[0];
          items.push(`⭐ 최다 연승 기록 보유자 [${p.displayName}] 닌자(${p.maxWinStreak}연승)의 아성에 도전할 자는 누구인가?`);
        } else {
          items.push("⭐ 새로운 연승 신화를 작성하여 대시보드 속보의 주인공이 되어 보세요!");
        }
      }

      // 3. 꿀챔프 소식
      const champWinRates: Record<string, { wins: number; games: number }> = {};
      records.forEach(r => {
        const process = (team: any[], won: boolean) => {
          team.forEach(p => {
            if (!p.champion || p.champion === "?") return;
            if (!champWinRates[p.champion]) champWinRates[p.champion] = { wins: 0, games: 0 };
            champWinRates[p.champion].games++;
            if (won) champWinRates[p.champion].wins++;
          });
        };
        process(r.team1, r.winTeam === 1);
        process(r.team2, r.winTeam === 2);
      });
      const honeyChamps = Object.entries(champWinRates)
        .map(([name, s]) => ({ name, wr: s.wins / s.games, games: s.games }))
        .filter(c => c.games >= 3 && c.wr >= 0.55)
        .sort((a, b) => b.wr - a.wr || b.games - a.games);
      if (honeyChamps.length > 0) {
        const c = honeyChamps[0];
        items.push(`🍯 [${c.name}] 챔피언, 최근 내전 승률 ${Math.round(c.wr * 100)}% (${c.games}판)를 돌파하며 1티어 꿀챔프로 판명!`);
      } else {
        items.push("🍯 아직 뚜렷한 1티어 꿀챔프가 나타나지 않았습니다. 메타 분석을 통해 꿀챔을 선점하세요!");
      }

      // 4. 업적 수집가 소식
      const badgeCollector = [...result]
        .filter(p => p.badges.length > 0)
        .sort((a, b) => b.badges.length - a.badges.length);
      if (badgeCollector.length > 0) {
        const p = badgeCollector[0];
        items.push(`🏆 [${p.displayName}] 닌자, 총 ${p.badges.length}개의 업적을 잠금 해제하며 전설의 수집가로 자리매김!`);
      } else {
        items.push("🏆 다양한 내전 업적들을 달성하고 대표 뱃지를 설정하여 자신을 표현해 보세요!");
      }

      // 5. 천적 감지
      let nemesisPair: any = null;
      for (const p of result) {
        if (!p.vsStats) continue;
        for (const [enemyNick, vs] of Object.entries(p.vsStats)) {
          if (vs.wins >= 3 && vs.losses === 0) {
            const enemyEntry = rawEntries.find(e => e.nickname === enemyNick);
            const enemyDisplayName = enemyEntry ? (enemyEntry.realName || enemyNick) : enemyNick;
            nemesisPair = { winner: p.displayName, loser: enemyDisplayName, wins: vs.wins };
            break;
          }
        }
        if (nemesisPair) break;
      }
      if (nemesisPair) {
        items.push(`🦁 천적 관계 경보: [${nemesisPair.winner}] 닌자가 [${nemesisPair.loser}] 닌자를 상대로 ${nemesisPair.wins}승 무패로 강세를 유지 중!`);
      } else {
        items.push("🦁 숙명의 대결: 아직 압도적인 천적 관계가 형성되지 않은 치열한 황금 밸런스 상태입니다.");
      }

      // 6. 무한 츠쿠요미 소식 (최근 3연패 이상 닌자)
      const tsukuyomiPlayers = [...result]
        .filter(p => p.currentStreak <= -3)
        .sort((a, b) => a.currentStreak - b.currentStreak);
      if (tsukuyomiPlayers.length > 0) {
        const listStr = tsukuyomiPlayers
          .map(p => `${p.displayName} 닌자(${Math.abs(p.currentStreak)}연패)`)
          .join(", ");
        items.push(`🌀 암부 정보 검출 완료: 최근 연패 늪에 빠져 무한 츠쿠요미에 갇힌 닌자 목록 [${listStr}]`);
      } else {
        items.push("🌀 최근 탈주닌자 경계령 해제: 현재 환술에 걸려 3연패 이상의 늪에 빠진 닌자는 없습니다.");
      }

      // 7. 오늘의 기상 예보 (플레이어 모스트 포켓픽)
      const playerChampPosMap = new Map<string, { wins: number; games: number }>();
      const POSITIONS_LIST = ["탑", "정글", "미드", "원딜", "서포터"];
      records.forEach(r => {
        const process = (team: any[], won: boolean) => {
          team.forEach((p, idx) => {
            if (!p.champion || p.champion === "?") return;
            const pos = POSITIONS_LIST[idx];
            if (!pos) return;

            const mainNick = resolveMainNickLocal(p.nickname);
            const key = `${mainNick}|||${pos}|||${p.champion}`;

            if (!playerChampPosMap.has(key)) {
              playerChampPosMap.set(key, { wins: 0, games: 0 });
            }
            const s = playerChampPosMap.get(key)!;
            s.games++;
            if (won) s.wins++;
          });
        };
        process(r.team1, r.winTeam === 1);
        process(r.team2, r.winTeam === 2);
      });

      const weatherCandidates: Array<{
        displayName: string;
        pos: string;
        champion: string;
        wr: number;
        games: number;
      }> = [];

      playerChampPosMap.forEach((s, key) => {
        const [mainNick, pos, champ] = key.split("|||");
        const wr = s.wins / s.games;
        if (s.games >= 3 && wr >= 0.75) {
          const entry = rawEntries.find(e => e.nickname === mainNick);
          const displayName = entry ? (entry.realName || mainNick) : mainNick;
          weatherCandidates.push({ displayName, pos, champion: champ, wr, games: s.games });
        }
      });

      weatherCandidates.sort((a, b) => b.wr - a.wr || b.games - a.games);

      if (weatherCandidates.length > 0) {
        const w = weatherCandidates[0];
        items.push(`⚡ 오늘의 기상 예보: [${w.displayName}] 닌자의 [${w.pos}] [${w.champion}]가 지나간 자리에 벼락과 함께 승률 ${Math.round(w.wr * 100)}% 기록..`);
      } else {
        items.push("⚡ 오늘의 기상 예보: 전장에 구름이 걷히며 평온한 대치 상태가 지속되고 있습니다.");
      }

      // 8. 리미티드 칭호 보유자
      if (titlesData.length > 0) {
        const holderDescs = titlesData.map(t => {
          const def = LIMITED_TITLE_DEFS.find(d => d.id === t.id);
          const entry = rawEntries.find((e: NicknameEntry) => e.nickname === t.holder);
          const displayName = entry ? (entry.realName?.trim() || t.holder) : t.holder;
          return def ? `${displayName}(${def.name})` : null;
        }).filter(Boolean) as string[];
        items.push(`✦ [리미티드 칭호] 특별 칭호 보유 닌자 — ${holderDescs.join(", ")}`);
      } else {
        items.push("✦ [리미티드 칭호] 아직 리미티드 칭호를 달성한 닌자가 없습니다. 최초 달성자가 되어 보세요!");
      }

      // 9. 챔피언 픽률 트렌드 (최근 10경기)
      const recentTen = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.gameNumber - a.gameNumber).slice(0, 10);
      const recentPickCounts: Record<string, number> = {};
      recentTen.forEach(r => {
        [...r.team1, ...r.team2].forEach((pl: any) => {
          if (!pl.champion || pl.champion === "?") return;
          recentPickCounts[pl.champion] = (recentPickCounts[pl.champion] || 0) + 1;
        });
      });
      const topPick = Object.entries(recentPickCounts).sort((a, b) => b[1] - a[1])[0];
      if (topPick) {
        items.push(`📈 [픽률 트렌드] 최근 ${recentTen.length}경기에서 가장 많이 선택된 챔피언은 [${topPick[0]}] (${topPick[1]}회 픽)! 현재 내전 메타를 장악 중.`);
      } else {
        items.push("📈 [픽률 트렌드] 아직 충분한 챔피언 픽 데이터가 없습니다. 경기를 등록해 메타를 분석해 보세요.");
      }

      // 10. 점수 TOP3 하이라이트
      if (result.length >= 3) {
        const [t1, t2, t3] = result;
        items.push(`🏅 [TOP3 하이라이트] 🥇${t1.displayName}(${t1.score}점) 🥈${t2.displayName}(${t2.score}점) 🥉${t3.displayName}(${t3.score}점) — 치열한 상위권 경쟁이 계속됩니다!`);
      } else if (result.length === 2) {
        items.push(`🏅 [TOP3 하이라이트] 🥇${result[0].displayName}(${result[0].score}점) 🥈${result[1].displayName}(${result[1].score}점) — 단 2인의 대결!`);
      } else if (result.length === 1) {
        items.push(`🏅 [TOP3 하이라이트] 현재 1인 독주 체제 — [${result[0].displayName}] 닌자(${result[0].score}점)`);
      }

      // 11. 연패 탈출 소식
      const escapedPlayers = [...result].filter(p => p.maxLoseStreak >= 3 && p.currentStreak > 0)
        .sort((a, b) => b.maxLoseStreak - a.maxLoseStreak);
      if (escapedPlayers.length > 0) {
        const ep = escapedPlayers[0];
        items.push(`💪 [연패 탈출] [${ep.displayName}] 닌자, 최대 ${ep.maxLoseStreak}연패의 어둠을 딛고 현재 ${ep.currentStreak}연승 재기 성공! 칠전팔기의 표상.`);
      } else {
        const deepLose = [...result].filter(p => p.maxLoseStreak >= 3).sort((a, b) => b.maxLoseStreak - a.maxLoseStreak);
        if (deepLose.length > 0) {
          items.push(`💪 [연패 탈출] [${deepLose[0].displayName}] 닌자, 최대 ${deepLose[0].maxLoseStreak}연패 경험 — 칠전팔기 역전의 날을 기다리고 있습니다.`);
        } else {
          items.push("💪 [연패 탈출] 현재 3연패 이상 경험자 없음 — 모든 닌자가 굳건한 정신력을 보이고 있습니다.");
        }
      }

      setBaseNewsItems(items);
      setPersons(result);
      setLoading(false);
    });
  }, []);

  // 시즌 선택이 바뀌면 해당 기간 기록으로 persons 재계산
  useEffect(() => {
    if (allRecords.length === 0 || nicknameEntries.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    let filtered = allRecords;
    if (selectedSeasonId !== "all") {
      const season = seasons.find(s => s.id === selectedSeasonId);
      if (season) {
        const endDate = season.endDate ?? today;
        filtered = allRecords.filter(r => r.date >= season.startDate && r.date <= endDate);
      }
    }

    const nicknameToEntry = new Map<string, NicknameEntry>();
    nicknameEntries.forEach(e => {
      nicknameToEntry.set(normalizeId(e.nickname), e);
      (e.altNicknames || []).forEach(alt => { if (alt.trim()) nicknameToEntry.set(normalizeId(alt.trim()), e); });
    });

    const entryGroups = new Map<string, { entry: NicknameEntry; nicks: string[] }>();
    const standaloneNicknames: string[] = [];
    getAllNicknames(filtered).forEach(nick => {
      const entry = nicknameToEntry.get(normalizeId(nick));
      if (entry) {
        if (!entryGroups.has(entry.id)) entryGroups.set(entry.id, { entry, nicks: [] });
        entryGroups.get(entry.id)!.nicks.push(nick);
      } else {
        standaloneNicknames.push(nick);
      }
    });

    const result: RankedPerson[] = [];
    entryGroups.forEach(({ entry, nicks }) => {
      const displayName = entry.realName?.trim() || entry.nickname;
      const hasAlts = (entry.altNicknames || []).filter(Boolean).length > 0;
      const stats = nicks.length > 1
        ? computeAggregatedStats(displayName, nicks, filtered, nicknameEntries)
        : { ...computePlayerStats(nicks[0], filtered, nicknameEntries), nickname: displayName };
      result.push({ ...stats, displayName, nicknames: nicks, mainNickname: entry.nickname, hasAlts });
    });
    standaloneNicknames.forEach(nick => {
      const stats = computePlayerStats(nick, filtered, nicknameEntries);
      result.push({ ...stats, displayName: nick, nicknames: [nick], mainNickname: nick, hasAlts: false });
    });

    result.sort((a, b) => b.score !== a.score ? b.score - a.score : b.winRate !== a.winRate ? b.winRate - a.winRate : b.wins - a.wins);
    setPersons(result);
  }, [selectedSeasonId, allRecords, nicknameEntries, seasons]);

  // 대표업적 ID 조회
  const getRepBadgeId = (mainNickname: string) =>
    nicknameEntries.find(e => e.nickname === mainNickname)?.representativeBadge;

  const getTrophies = (mainNickname: string) =>
    nicknameEntries.find(e => e.nickname === mainNickname)?.trophies ?? [];

  const getLimitedTitlesFor = (mainNickname: string) =>
    limitedTitles.filter(t => t.holder === mainNickname);

  // 대표업적 설정/해제 (토글)
  const handleSetRepBadge = async (mainNickname: string, badgeId: string) => {
    const current = getRepBadgeId(mainNickname);
    const next = current === badgeId ? undefined : badgeId;
    const updated = nicknameEntries.map(e =>
      e.nickname === mainNickname
        ? { ...e, representativeBadge: next, equippedLimitedTitle: next ? undefined : e.equippedLimitedTitle }
        : e
    );
    setNicknameEntries(updated);
    await saveNicknames(updated);
  };

  // 리미티드 업적 장착/해제 (토글) — 장착 시 일반 대표업적 해제
  const getEquippedLimitedTitle = (mainNickname: string) =>
    nicknameEntries.find(e => e.nickname === mainNickname)?.equippedLimitedTitle;

  const handleEquipLimitedTitle = async (mainNickname: string, titleId: string) => {
    const current = getEquippedLimitedTitle(mainNickname);
    const next = current === titleId ? undefined : titleId;
    const updated = nicknameEntries.map(e =>
      e.nickname === mainNickname
        ? { ...e, equippedLimitedTitle: next, representativeBadge: next ? undefined : e.representativeBadge }
        : e
    );
    setNicknameEntries(updated);
    await saveNicknames(updated);
  };

  // 랭킹에 표시할 업적: 대표업적 우선, 없으면 최고등급
  const getDisplayBadge = (p: RankedPerson) => {
    const repId = getRepBadgeId(p.mainNickname);
    if (repId) {
      const repBadge = p.badges.find(b => b.id === repId);
      if (repBadge) return repBadge;
    }
    const sorted = [...p.badges].sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));
    return sorted[0] ?? null;
  };

  // 밀집 순위
  const ranks: number[] = [];
  for (let i = 0; i < persons.length; i++) {
    if (i === 0) ranks.push(1);
    else if (persons[i - 1].score === persons[i].score) ranks.push(ranks[i - 1]);
    else ranks.push(ranks[i - 1] + 1);
  }

  const rankIcon = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}위`);

  const StreakBadge = ({ streak }: { streak: number }) => {
    if (Math.abs(streak) < 2) return <span className="text-xs text-gray-400">-</span>;
    if (streak > 0) return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold"
        style={{ background: "#ffebee", color: "var(--loss)", border: "1px solid #ffcdd2" }}>
        🔥 {streak}연승중
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold"
        style={{ background: "#e3f2fd", color: "#1565c0", border: "1px solid #bbdefb" }}>
        🌧️ {Math.abs(streak)}연패중
      </span>
    );
  };

  const newsTitles = {
    leaf: { name: "나뭇잎 일보", icon: "🍃" },
    rain: { name: "우중 예보", icon: "🌧️" },
    aka:  { name: "달의 눈 첩보", icon: "🌕" },
    sand: { name: "모래바람 통신", icon: "⏳" },
    cloud: { name: "뇌운 전보", icon: "⚡" },
    hideout: { name: "지하아지트 첩보", icon: "👁️" },
    myoboku: { name: "묘목산 선보", icon: "🐸" },
    anbu: { name: "암살전술 특수부대 기밀", icon: "🎭" },
    orochimaru: { name: "비밀실험실 통신", icon: "🧪" },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <GuideBanner
        pageKey="ranking"
        icon="🏆"
        title="랭킹 페이지 사용법"
        guideAnchor="ranking"
        items={[
          "캡쳐 분석으로 등록된 게임 기록을 바탕으로 KDA·승률·MVP 등 다양한 통계가 자동 계산됩니다.",
          "상단 탭에서 KDA / 승률 / MVP / 어시 등 원하는 지표로 순위를 바꿔볼 수 있어요.",
          "플레이어 카드를 클릭하면 보유 업적(뱃지) 목록을 확인할 수 있습니다.",
          "기록이 없으면 랭킹이 표시되지 않아요. 먼저 캡쳐 분석 페이지에서 게임을 등록하세요.",
        ]}
      />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--accent)" }}>🏆 랭킹</h2>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>캡쳐 분석으로 등록된 게임 기록 기반으로 자동 계산됩니다</p>
        </div>
        {persons.length > 0 && (
          <span className="text-sm px-3 py-1 rounded-full font-semibold"
            style={{ background: "var(--hover)", color: "var(--accent)", border: "1px solid var(--border-green)" }}>
            총 {persons.length}명
          </span>
        )}
      </div>

      {/* 시즌 선택 필터 */}
      {seasons.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {[{ id: "all", label: "전체 기간" }, ...seasons].map(s => {
            const isActive = s.id !== "all" && !("closed" in s ? s.closed : false)
              && ("startDate" in s ? s.startDate <= new Date().toISOString().slice(0, 10) : false)
              && (!("endDate" in s) || !(s as SeasonDef).endDate || (s as SeasonDef).endDate! >= new Date().toISOString().slice(0, 10));
            const selected = selectedSeasonId === s.id;
            return (
              <button key={s.id} onClick={() => setSelectedSeasonId(s.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: selected ? "var(--accent)" : "var(--panel)",
                  color:      selected ? "#fff"          : "var(--text-muted)",
                  border:     selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                }}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>}
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 📰 테마 반응형 한줄 뉴스 속보 배너 */}
      {newsItems.length > 0 && (
        <div className="mb-6 rounded-xl border overflow-hidden flex items-center h-11 text-sm shadow-sm"
          style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
          {/* 뉴스 발간처 타이틀 */}
          <div className="h-full px-4 flex items-center gap-1.5 font-black shrink-0 border-r"
            style={{
              borderColor: "var(--border)",
              background: activeTheme === "aka"
                ? "rgba(197, 61, 61, 0.15)"
                : activeTheme === "rain"
                ? "rgba(139, 92, 246, 0.15)"
                : activeTheme === "sand"
                ? "rgba(210, 157, 72, 0.15)"
                : activeTheme === "cloud"
                ? "rgba(59, 130, 246, 0.15)"
                : activeTheme === "hideout"
                ? "rgba(239, 68, 68, 0.15)"
                : activeTheme === "myoboku"
                ? "rgba(245, 158, 11, 0.15)"
                : activeTheme === "anbu"
                ? "rgba(107, 114, 128, 0.15)"
                : activeTheme === "orochimaru"
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(34, 197, 94, 0.15)",
              color: activeTheme === "aka"
                ? "#ef4444"
                : activeTheme === "rain"
                ? "#9d92d4"
                : activeTheme === "sand"
                ? "#c27a38"
                : activeTheme === "cloud"
                ? "#2563eb"
                : activeTheme === "hideout"
                ? "#f43f5e"
                : activeTheme === "myoboku"
                ? "#d97706"
                : activeTheme === "anbu"
                ? "#6b7280"
                : activeTheme === "orochimaru"
                ? "#059669"
                : "#22c55e",
            }}>
            <span>{newsTitles[activeTheme].icon}</span>
            <span className="hidden sm:inline">{newsTitles[activeTheme].name}</span>
          </div>
          {/* 흐르는 뉴스 아이템 */}
          <div className="flex-1 h-full px-4 flex items-center overflow-hidden relative">
            {newsItems.map((item, idx) => (
              <div key={idx}
                className="absolute left-4 right-4 flex items-center gap-2 transition-all duration-500"
                style={{
                  opacity: currentNewsIdx === idx ? 1 : 0,
                  transform: currentNewsIdx === idx ? "translateY(0)" : "translateY(15px)",
                  pointerEvents: currentNewsIdx === idx ? "auto" : "none",
                }}>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-red-500/10 text-red-500 border border-red-500/20">
                  속보
                </span>
                <span className="truncate font-medium text-xs sm:text-sm" style={{ color: "var(--text)" }}>{item}</span>
              </div>
            ))}
          </div>
          {/* 전체보기 버튼 */}
          <button
            onClick={() => setNewsModalOpen(true)}
            className="h-full px-3 shrink-0 text-xs font-bold border-l transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "none" }}
            title="뉴스 전체보기">
            전체
          </button>
        </div>
      )}

      {/* 뉴스 전체보기 모달 */}
      {newsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setNewsModalOpen(false)}>
          <div className="w-full mx-4 rounded-2xl overflow-hidden flex flex-col"
            style={{ maxWidth: 540, maxHeight: "80vh", background: "var(--panel)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0"
              style={{ borderColor: "var(--border)" }}>
              <div className="font-black text-base flex items-center gap-2" style={{ color: "var(--accent)" }}>
                <span>{newsTitles[activeTheme].icon}</span>
                <span>{newsTitles[activeTheme].name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">전체 속보</span>
              </div>
              <button onClick={() => setNewsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-lg"
                style={{ background: "var(--hover)", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {newsItems.map((item, idx) => (
                <div key={idx}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "var(--panel-alt)", border: "1px solid var(--border)" }}>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 bg-red-500/10 text-red-500 border border-red-500/20">
                    속보
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm" style={{ minWidth: "640px" }}>
          <thead>
            <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
              <th className="px-4 py-3 text-left" style={{ color: "var(--text-muted)" }}>순위</th>
              <th className="px-4 py-3 text-left" style={{ color: "var(--text-muted)" }}>이름</th>
              <th className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>최근흐름</th>
              <th className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>승/패</th>
              <th className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>승률</th>
              <th className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>점수</th>
              <th className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>업적</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center" style={{ color: "var(--text-muted)" }}>기록을 불러오는 중입니다...</td></tr>
            ) : persons.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center" style={{ color: "var(--text-muted)" }}>게임 기록이 없습니다. 먼저 캡쳐 분석을 통해 경기를 등록해주세요!</td></tr>
            ) : (
              persons.map((p, i) => {
                const displayBadge = getDisplayBadge(p);
                const isRep = displayBadge ? displayBadge.id === getRepBadgeId(p.mainNickname) : false;
                return (
                  <tr key={p.mainNickname}
                    style={{
                      background: ranks[i] === 1 ? "rgba(254,240,138,0.45)"
                                : ranks[i] === 2 ? "rgba(241,245,249,0.8)"
                                : ranks[i] === 3 ? "rgba(255,247,237,0.8)"
                                : i % 2 === 0 ? "var(--panel)" : "var(--panel-alt)",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      borderLeft: ranks[i] === 1 ? "4px solid #fbbf24"
                                 : ranks[i] === 2 ? "4px solid #94a3b8"
                                 : ranks[i] === 3 ? "4px solid #f97316"
                                 : "3px solid transparent",
                    }}
                    onClick={() => {
                      if (p.hasAlts) router.push(`/ranking/person/${encodeURIComponent(p.mainNickname)}`);
                      else router.push(`/ranking/${encodeURIComponent(p.nicknames[0])}`);
                    }}
                    className="hover:brightness-95 transition-all">
                    <td className="px-4 py-3 font-bold" style={{ color: ranks[i] <= 3 ? "var(--accent)" : "var(--text-muted)" }}>{rankIcon(ranks[i])}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {ranks[i] <= 3 ? (
                          <span style={{ color: ranks[i] === 1 ? "#b45309" : ranks[i] === 2 ? "#64748b" : "#c2410c", fontWeight: 800 }}>
                            {p.displayName}
                          </span>
                        ) : (
                          <span className="font-semibold" style={{ color: "var(--text)" }}>{p.displayName}</span>
                        )}

                        {p.topChampions.length > 0 && (
                          <div className="flex gap-1 ml-1 items-center">
                            {p.topChampions.map((c, ci) => {
                              const textColor = ci === 0 ? "var(--accent)" : ci === 1 ? "var(--text-muted)" : "var(--text-dim)";
                              return (
                                <span key={c.name} className="px-1.5 py-0.5 rounded"
                                  style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", fontSize: "10px", fontWeight: 600, color: textColor, lineHeight: 1.4 }}>
                                  {c.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <TrophyList trophies={getTrophies(p.mainNickname)} />
                        {(() => {
                          const equippedId = getEquippedLimitedTitle(p.mainNickname);
                          const equipped = equippedId
                            ? limitedTitles.find(t => t.id === equippedId && t.holder === p.mainNickname)
                            : null;
                          return equipped ? <LimitedTitleBadge key={equipped.id} title={equipped} /> : null;
                        })()}
                        {p.hasAlts && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "var(--hover)", color: "#0f766e", border: "1px solid #5eead4", fontSize: "10px" }}>
                            계정 多
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><StreakBadge streak={p.currentStreak} /></td>
                    <td className="px-4 py-3 text-center">
                      <span style={{ color: "var(--win)" }}>{p.wins}승</span>
                      <span style={{ color: "var(--text-muted)" }}> / </span>
                      <span style={{ color: "var(--loss)" }}>{p.losses}패</span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: "var(--accent)" }}>
                      {formatWinRate(p.wins, p.totalGames)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: p.score >= 0 ? "var(--win)" : "var(--loss)" }}>
                      {p.score >= 0 ? "+" : ""}{p.score}
                    </td>

                    {/* 업적 셀 - 클릭 시 모달 */}
                    <td className="px-4 py-3 text-center"
                      onClick={e => { e.stopPropagation(); setBadgeModal(p); }}>
                      {(() => {
                        const equippedId = getEquippedLimitedTitle(p.mainNickname);
                        const equippedRecord = equippedId
                          ? limitedTitles.find(t => t.id === equippedId && t.holder === p.mainNickname)
                          : null;
                        const equippedDef = equippedRecord ? getLimitedTitleDef(equippedRecord.id) : null;

                        if (equippedDef && equippedRecord) {
                          return (
                            <div
                              className="inline-flex flex-col items-center gap-0.5 cursor-pointer"
                              onMouseEnter={(e) => {
                                const r = e.currentTarget.getBoundingClientRect();
                                setLimitedTooltip({ x: r.left + r.width / 2, y: r.top, titleId: equippedRecord.id });
                              }}
                              onMouseLeave={() => setLimitedTooltip(null)}
                            >
                              <div
                                className="limited-badge-circle"
                                style={{
                                  width: 20,
                                  height: 20,
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transform: "scale(1.45)",
                                  background: `linear-gradient(var(--panel), var(--panel)) padding-box, linear-gradient(135deg, ${equippedDef.color}, ${equippedDef.accentColor}) border-box`,
                                  border: "1.5px solid transparent",
                                  borderRadius: "50%",
                                  ["--lp-c1" as any]: `${equippedDef.color}66`,
                                  ["--lp-c2" as any]: `${equippedDef.accentColor}33`,
                                }}>
                                <span style={{ fontSize: 13, lineHeight: 1 }}>
                                  {equippedDef.icon}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        if (displayBadge) {
                          return (
                            <div
                              className="inline-flex flex-col items-center gap-0.5 cursor-pointer"
                              onMouseEnter={(e) => {
                                const r = e.currentTarget.getBoundingClientRect();
                                setBadgeTooltip({ x: r.left + r.width / 2, y: r.top, badge: displayBadge });
                              }}
                              onMouseLeave={() => setBadgeTooltip(null)}
                            >
                              <span style={{ fontSize: 20, lineHeight: 1, filter: "drop-shadow(0 0 3px rgba(0,0,0,0.3))" }}>
                                {displayBadge.icon}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <span className="cursor-pointer text-xs" style={{ color: "var(--text-dim)" }}
                            title="클릭하여 업적 보기">-</span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 🎭 암살전술 특수부대 테마 해금용 숨겨진 그림자 음영 (나뭇잎 테마에서만 노출) */}
      {activeTheme === "leaf" && (
        <div className="flex justify-center mt-12 mb-8" style={{ pointerEvents: "auto" }}>
          <div
            onClick={handleAnbuUnlock}
            title="그림자 기운"
            className="transition-all duration-300 hover:opacity-95 hover:scale-[1.03] cursor-pointer"
            style={{
              opacity: anbuUnlocked ? 0.85 : 0.48,
              color: "var(--text)",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.18))",
            }}
          >
            <svg width="280" height="32" viewBox="0 0 280 32" fill="currentColor">
              <defs>
                <filter id="shadow-blur">
                  <feGaussianBlur stdDeviation="3.5" />
                </filter>
              </defs>
              {/* A realistic horizontally stretched shadow projection */}
              <path
                d="M 10,16 C 40,8 80,4 120,8 C 150,4 180,2 210,6 C 240,12 260,10 270,16 C 260,22 230,24 190,26 C 150,28 100,28 60,26 C 30,24 15,20 10,16 Z"
                filter="url(#shadow-blur)"
              />
            </svg>
          </div>
        </div>
      )}

      {/* 업적 hover 툴팁 (fixed — overflow 클리핑 우회) */}
      {badgeTooltip && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: badgeTooltip.x,
            top: badgeTooltip.y - 8,
            transform: "translate(-50%, -100%)",
            minWidth: 180,
          }}
        >
          <div
            className="px-3 py-2.5 rounded-lg text-xs shadow-2xl"
            style={{
              background: "var(--panel)",
              border: `1px solid ${badgeTooltip.badge.color}99`,
              color: "var(--text)",
              whiteSpace: "nowrap",
              boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${badgeTooltip.badge.color}44`,
            }}
          >
            <div className="font-bold mb-1" style={{ color: badgeTooltip.badge.color }}>
              {badgeTooltip.badge.icon} {badgeTooltip.badge.name}
            </div>
            <div className="mb-1" style={{ color: "var(--text-muted)" }}>{badgeTooltip.badge.description}</div>
            <div className="pt-1 border-t text-center" style={{ borderColor: "var(--border)", color: "var(--text-dim)", fontSize: 10 }}>
              클릭하여 대표업적 설정
            </div>
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full"
            style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${badgeTooltip.badge.color}99` }}
          />
        </div>
      )}

      {/* 리미티드 업적 hover 툴팁 */}
      {limitedTooltip && (() => {
        const def = getLimitedTitleDef(limitedTooltip.titleId);
        const record = limitedTitles.find(t => t.id === limitedTooltip.titleId);
        if (!def) return null;
        return (
          <div
            className="fixed pointer-events-none z-[9999]"
            style={{
              left: limitedTooltip.x,
              top: limitedTooltip.y - 8,
              transform: "translate(-50%, -100%)",
              minWidth: 220,
            }}
          >
            <div
              className="px-3 py-3 rounded-xl text-xs shadow-2xl"
              style={{
                background: "var(--panel)",
                border: `1px solid ${def.color}88`,
                color: "var(--text)",
                whiteSpace: "nowrap",
                boxShadow: `0 8px 28px rgba(0,0,0,0.45), 0 0 0 1px ${def.color}33`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span style={{ fontSize: 18 }}>{def.icon}</span>
                <span className="font-black text-sm" style={{ color: def.color }}>{def.name}</span>
                <span className="ml-auto px-1.5 py-0.5 rounded font-bold"
                  style={{ background: `${def.color}22`, color: def.color, fontSize: 10, border: `1px solid ${def.color}44` }}>
                  리미티드
                </span>
              </div>
              <div className="mb-1.5 leading-relaxed" style={{ color: "var(--text-muted)", fontSize: 11 }}>{def.description}</div>
              <div className="flex items-center gap-1 mb-1.5 pt-1.5 border-t" style={{ borderColor: "var(--border)", fontSize: 10 }}>
                <span style={{ color: "var(--text-dim)" }}>달성 조건</span>
                <span style={{ color: def.color, fontWeight: 700 }}>{def.condition}</span>
              </div>
              {record && (
                <div className="flex items-center gap-1 pt-1 border-t" style={{ borderColor: "var(--border)", fontSize: 10 }}>
                  <span style={{ color: "var(--text-dim)" }}>달성일</span>
                  <span style={{ color: def.color, fontWeight: 700 }}>{record.date}</span>
                  <span className="ml-auto" style={{ color: "var(--text-dim)" }}>정원 1인 · 영구 소유</span>
                </div>
              )}
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full"
              style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${def.color}88` }}
            />
          </div>
        );
      })()}

      {/* 대표업적 모달 */}
      {badgeModal && (
        <BadgeModal
          person={badgeModal}
          repBadgeId={getRepBadgeId(badgeModal.mainNickname)}
          onSet={(badgeId) => handleSetRepBadge(badgeModal.mainNickname, badgeId)}
          onClose={() => setBadgeModal(null)}
          allLimitedTitles={limitedTitles}
          equippedTitleId={getEquippedLimitedTitle(badgeModal.mainNickname)}
          onEquip={(titleId) => handleEquipLimitedTitle(badgeModal.mainNickname, titleId)}
        />
      )}
    </div>
  );
}
