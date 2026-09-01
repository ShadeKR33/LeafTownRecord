"use client";

import type { GameRecord, PlayerGameData } from "@/lib/types";
import { ChampionPortrait } from "@/components/ChampionPortrait";
import { computeGameAwards } from "@/lib/awards";

function DonutGauge({ percent, label, color, size = 52, displayValue }: { percent: number; label: string; color: string; size?: number; displayValue?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.26} fontWeight="bold" fill="var(--text)">
          {displayValue ?? `${Math.round(clamped)}%`}
        </text>
      </svg>
      <span className="text-[10px] mt-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

function DamageBar({ champion, value, pct, color, isTop }: {
  champion: string; value: number; pct: number; color: string; isTop?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold w-16 flex-shrink-0 truncate" style={{ color: "var(--text)" }}>{champion}</span>
      <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "var(--hover)" }}>
        <div
          className="h-full rounded flex items-center justify-end px-1.5"
          style={{ width: `${pct}%`, background: color, minWidth: value > 0 ? 30 : 0 }}
        >
          <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: "var(--panel-alt)" }}>
            {isTop ? "⭐ " : ""}{value.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlayerStatRow({ player, dmgPercent, dtPercent, kp, visionPercent, csPercent, gameDuration, isWinner, award }: { player: PlayerGameData; dmgPercent: number | null; dtPercent: number | null; kp: number | null; visionPercent: number | null; csPercent: number | null; gameDuration?: number; isWinner: boolean; award?: "mvp" | "ace" }) {
  const kda = `${player.kills ?? 0} / ${player.deaths ?? 0} / ${player.assists ?? 0}`;
  const csPerMin = gameDuration && gameDuration > 0 && typeof player.cs === "number" ? (player.cs / gameDuration).toFixed(1) : null;
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded flex-wrap" style={{ background: isWinner ? "rgba(82,168,255,0.08)" : "var(--panel-alt)" }}>
      <ChampionPortrait name={player.champion} size={44} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
          {player.champion || "-"}
          {award === "mvp" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#e0a030", color: "#1a1208" }}>👑 MVP</span>
          )}
          {award === "ace" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#7a5cc0", color: "#fff" }}>⚔️ ACE</span>
          )}
        </div>
        <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{player.nickname}</div>
        <div className="text-xs mt-1" style={{ color: "var(--text)" }}>KDA {kda}</div>
      </div>
      <div className="flex items-center gap-2 flex-wrap flex-shrink-0 justify-end">
        {dmgPercent !== null && <DonutGauge percent={dmgPercent} label="가한피해" color="#e0a030" />}
        {kp !== null && <DonutGauge percent={kp} label="킬관여" color="#5090d0" />}
        {dtPercent !== null && <DonutGauge percent={dtPercent} label="받은피해" color="#c05050" />}
        {csPercent !== null && csPerMin !== null && <DonutGauge percent={100} label="분당CS" color="#50b070" displayValue={csPerMin} />}
        {csPercent !== null && csPerMin === null && typeof player.cs === "number" && <DonutGauge percent={100} label="CS" color="#50b070" displayValue={`${player.cs}`} />}
        {visionPercent !== null && <DonutGauge percent={100} label="시야점수" color="#8060c0" displayValue={`${player.visionScore ?? 0}`} />}
      </div>
    </div>
  );
}

function BansRow({ team1Bans, team2Bans }: { team1Bans: string[]; team2Bans: string[] }) {
  if ((!team1Bans || team1Bans.length === 0) && (!team2Bans || team2Bans.length === 0)) return null;
  return (
    <div className="flex flex-col md:flex-row gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--hover)" }}>
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--win)" }}>🚫 팀1 밴</span>
        <div className="flex flex-wrap gap-1">
          {(team1Bans || []).map((c, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--hover)", color: "var(--text-muted)" }}>{c}</span>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center gap-2 md:justify-end">
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--loss)" }}>🚫 팀2 밴</span>
        <div className="flex flex-wrap gap-1 md:justify-end">
          {(team2Bans || []).map((c, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--hover)", color: "var(--text-muted)" }}>{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamHeader({ teamLabel, isWinner }: { teamLabel: string; isWinner: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: isWinner ? "var(--win)" : "var(--loss)", color: "var(--panel-alt)" }}>
        {isWinner ? "WIN" : "LOSS"}
      </span>
      <span className="text-sm font-bold" style={{ color: isWinner ? "var(--win)" : "var(--loss)" }}>{teamLabel}</span>
    </div>
  );
}

export default function MatchStatsChart({ record }: { record: GameRecord }) {
  const team1 = record.team1.filter((p) => p.nickname);
  const team2 = record.team2.filter((p) => p.nickname);

  const team1DmgTotal = team1.reduce((s, p) => s + (p.damageDealt || 0), 0);
  const team2DmgTotal = team2.reduce((s, p) => s + (p.damageDealt || 0), 0);
  const team1DtTotal = team1.reduce((s, p) => s + (p.damageTaken || 0), 0);
  const team2DtTotal = team2.reduce((s, p) => s + (p.damageTaken || 0), 0);

  const hasDamageData = team1DmgTotal > 0 || team2DmgTotal > 0;
  const maxDamage = Math.max(1, team1.reduce((m, p) => Math.max(m, p.damageDealt || 0), 0), team2.reduce((m, p) => Math.max(m, p.damageDealt || 0), 0));

  const team1KillsTotal = team1.reduce((s, p) => s + (p.kills || 0), 0);
  const team2KillsTotal = team2.reduce((s, p) => s + (p.kills || 0), 0);

  const team1VisionTotal = team1.reduce((s, p) => s + (p.visionScore || 0), 0);
  const team2VisionTotal = team2.reduce((s, p) => s + (p.visionScore || 0), 0);
  const team1CsTotal = team1.reduce((s, p) => s + (p.cs || 0), 0);
  const team2CsTotal = team2.reduce((s, p) => s + (p.cs || 0), 0);

  const getDmgPercent = (p: PlayerGameData, teamTotal: number) =>
    teamTotal > 0 && typeof p.damageDealt === "number" ? (p.damageDealt / teamTotal) * 100 : null;
  const getDtPercent = (p: PlayerGameData, teamTotal: number) =>
    teamTotal > 0 && typeof p.damageTaken === "number" ? (p.damageTaken / teamTotal) * 100 : null;
  const getKp = (p: PlayerGameData, teamKillsTotal: number) =>
    teamKillsTotal > 0 ? ((p.kills || 0) + (p.assists || 0)) / teamKillsTotal * 100 : null;
  const getVisionPercent = (p: PlayerGameData, teamTotal: number) =>
    teamTotal > 0 && typeof p.visionScore === "number" ? (p.visionScore / teamTotal) * 100 : null;
  const getCsPercent = (p: PlayerGameData, teamTotal: number) =>
    teamTotal > 0 && typeof p.cs === "number" ? (p.cs / teamTotal) * 100 : null;

  // 승리팀 최고 기여자 = MVP, 패배팀 최고 기여자 = 에이스 (순위/점수에는 영향 없는 표시용)
  const awards = hasDamageData ? computeGameAwards(team1, team2, record.winTeam) : null;
  const getAward = (team: 1 | 2, idx: number): "mvp" | "ace" | undefined => {
    if (!awards) return undefined;
    if (awards.mvpTeam === team && awards.mvpIndex === idx) return "mvp";
    if (awards.aceTeam === team && awards.aceIndex === idx) return "ace";
    return undefined;
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TeamHeader teamLabel="팀 1" isWinner={record.winTeam === 1} />
          <div className="space-y-1.5">
            {team1.map((p, i) => (
              <PlayerStatRow key={i} player={p} dmgPercent={getDmgPercent(p, team1DmgTotal)} dtPercent={getDtPercent(p, team1DtTotal)} kp={getKp(p, team1KillsTotal)} visionPercent={getVisionPercent(p, team1VisionTotal)} csPercent={getCsPercent(p, team1CsTotal)} gameDuration={record.gameDuration} isWinner={record.winTeam === 1} award={getAward(1, i)} />
            ))}
          </div>
        </div>
        <div>
          <TeamHeader teamLabel="팀 2" isWinner={record.winTeam === 2} />
          <div className="space-y-1.5">
            {team2.map((p, i) => (
              <PlayerStatRow key={i} player={p} dmgPercent={getDmgPercent(p, team2DmgTotal)} dtPercent={getDtPercent(p, team2DtTotal)} kp={getKp(p, team2KillsTotal)} visionPercent={getVisionPercent(p, team2VisionTotal)} csPercent={getCsPercent(p, team2CsTotal)} gameDuration={record.gameDuration} isWinner={record.winTeam === 2} award={getAward(2, i)} />
            ))}
          </div>
        </div>
      </div>

      {hasDamageData && (
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--hover)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>⚔️ 챔피언 딜량 비교</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              {team1.map((p, i) => (
                <DamageBar key={i} champion={p.champion || ""} value={p.damageDealt || 0} pct={p.damageDealt ? (p.damageDealt / maxDamage) * 100 : 0} color="var(--win)" isTop={(p.damageDealt || 0) === maxDamage} />
              ))}
            </div>
            <div className="space-y-1.5">
              {team2.map((p, i) => (
                <DamageBar key={i} champion={p.champion || ""} value={p.damageDealt || 0} pct={p.damageDealt ? (p.damageDealt / maxDamage) * 100 : 0} color="var(--loss)" isTop={(p.damageDealt || 0) === maxDamage} />
              ))}
            </div>
          </div>
        </div>
      )}

      <BansRow team1Bans={record.bans?.team1 || []} team2Bans={record.bans?.team2 || []} />
    </div>
  );
}
