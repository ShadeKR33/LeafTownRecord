// .rofl binary parser (browser-side)
// Supports ROFL 1.x (RIOT:ROFL: magic) and ROFL 2.x (RIOT\x02\x00 binary header)

export interface RoflPlayer {
  riotId: string;
  champion: string;
  team: 1 | 2;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  damageDealt: number;
  damageTaken: number;
  visionScore: number;
  controlWardsBought: number;
  position: string;
}

export interface RoflParseResult {
  gameVersion: string;
  gameDurationSeconds: number;
  winTeam: 1 | 2;
  team1: RoflPlayer[];
  team2: RoflPlayer[];
  bans?: { team1: string[]; team2: string[] };
}

const POSITION_MAP: Record<string, string> = {
  TOP: "탑", JUNGLE: "정글", MIDDLE: "미드", BOTTOM: "원딜", UTILITY: "서포터",
};
const POSITION_ORDER = ["탑", "정글", "미드", "원딜", "서포터"];

function buildPlayer(p: Record<string, string>): RoflPlayer {
  const pos = (p.TEAM_POSITION ?? p.INDIVIDUAL_POSITION ?? "").toUpperCase();
  return {
    riotId: p.RIOT_ID_GAME_NAME ?? p.NAME ?? "",
    champion: p.CHAMPION ?? p.SKIN ?? "",
    team: p.TEAM === "100" ? 1 : 2,
    win: p.WIN === "Win",
    kills: parseInt(p.CHAMPIONS_KILLED ?? "0") || 0,
    deaths: parseInt(p.DEATHS ?? p.NUM_DEATHS ?? "0") || 0,
    assists: parseInt(p.ASSISTS ?? "0") || 0,
    cs: (parseInt(p.MINIONS_KILLED ?? "0") || 0) + (parseInt(p.NEUTRAL_MINIONS_KILLED ?? "0") || 0),
    damageDealt: parseInt(p.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS ?? "0") || 0,
    damageTaken: parseInt(p.TOTAL_DAMAGE_TAKEN ?? "0") || 0,
    visionScore: parseInt(p.VISION_SCORE ?? "0") || 0,
    controlWardsBought: parseInt(p.VISION_WARDS_BOUGHT_IN_GAME ?? "0") || 0,
    position: POSITION_MAP[pos] ?? pos,
  };
}

function sortByPosition(players: RoflPlayer[]): RoflPlayer[] {
  return [...players].sort((a, b) => {
    const ai = POSITION_ORDER.indexOf(a.position);
    const bi = POSITION_ORDER.indexOf(b.position);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

// ─── 밴 데이터 추출 헬퍼 ──────────────────────────────────────────────────────
type RawBanEntry = { championId?: number | string; pickTurn?: number };
type RawTeam = { teamId?: number; bans?: RawBanEntry[] };

function extractBansFromTeams(teams: unknown): { team1: string[]; team2: string[] } | undefined {
  if (!Array.isArray(teams)) return undefined;
  const arr = teams as RawTeam[];
  const t100 = arr.find(t => t.teamId === 100);
  const t200 = arr.find(t => t.teamId === 200);
  const toBanList = (bans: RawBanEntry[] = []) =>
    bans
      .filter(b => b.championId !== undefined && Number(b.championId) !== -1)
      .sort((a, b) => (a.pickTurn ?? 0) - (b.pickTurn ?? 0))
      .map(b => String(b.championId));
  const b1 = toBanList(t100?.bans);
  const b2 = toBanList(t200?.bans);
  if (b1.length === 0 && b2.length === 0) return undefined;
  return { team1: b1, team2: b2 };
}

// "teams" 키를 텍스트에서 스캔해 배열 추출 (ROFL 2.x용)
function scanTeamsFromText(text: string): { team1: string[]; team2: string[] } | undefined {
  const TEAMS_KEY = '"teams"';
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const idx = text.indexOf(TEAMS_KEY, searchFrom);
    if (idx === -1) break;
    let pos = idx + TEAMS_KEY.length;
    while (pos < text.length && (text[pos] === ":" || text[pos] === " " || text[pos] === "\t")) pos++;
    if (text[pos] !== "[") { searchFrom = pos; continue; }
    let depth = 0, start = pos;
    while (pos < text.length) {
      if (text[pos] === "[") depth++;
      else if (text[pos] === "]") { depth--; if (depth === 0) { pos++; break; } }
      pos++;
    }
    try {
      const teams = JSON.parse(text.slice(start, pos));
      const result = extractBansFromTeams(teams);
      if (result) return result;
    } catch { /* try next occurrence */ }
    searchFrom = pos;
  }
  return undefined;
}

// ─── Data Dragon: 챔피언 ID/내부명 → 한국어 이름 변환 ──────────────────────
// byId:   "523" → "아펠리오스"   (밴 챔피언 ID)
// byName: "Syndra" → "신드라"   (플레이어 챔피언 내부명)
const CHAMP_MAPS_KEY = "champ_maps_v2";
interface ChampMaps { byId: Record<string, string>; byName: Record<string, string> }
let _champMaps: ChampMaps | null = null;

async function getChampionMaps(): Promise<ChampMaps> {
  if (_champMaps) return _champMaps;
  try {
    const raw = localStorage.getItem(CHAMP_MAPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChampMaps;
      if (parsed.byId && parsed.byName) { _champMaps = parsed; return _champMaps; }
    }
  } catch {}
  try {
    const versRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions: string[] = await versRes.json();
    const ver = versions[0];
    const champRes = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`
    );
    const champData = await champRes.json();
    const byId: Record<string, string> = {};
    const byName: Record<string, string> = {};
    for (const key of Object.keys(champData.data as Record<string, { id: string; key: string; name: string }>)) {
      const c = (champData.data as Record<string, { id: string; key: string; name: string }>)[key];
      byId[c.key] = c.name;    // "523" → "아펠리오스"
      byName[c.id] = c.name;   // "Aphelios" → "아펠리오스"
    }
    _champMaps = { byId, byName };
    try { localStorage.setItem(CHAMP_MAPS_KEY, JSON.stringify(_champMaps)); } catch {}
    return _champMaps;
  } catch {
    return { byId: {}, byName: {} };
  }
}

async function resolveChampionIds(
  bans: { team1: string[]; team2: string[] }
): Promise<{ team1: string[]; team2: string[] }> {
  const allIds = [...bans.team1, ...bans.team2].filter(Boolean);
  if (allIds.length === 0) return bans;
  if (allIds.every(id => /^\D/.test(id))) return bans; // 이미 이름
  const maps = await getChampionMaps();
  const resolve = (ids: string[]) => ids.map(id => maps.byId[id] ?? id);
  return { team1: resolve(bans.team1), team2: resolve(bans.team2) };
}

// ─── ROFL 1.x 파서 (RIOT:ROFL: magic) ─────────────────────────────────────
function parseClassicFormat(buffer: ArrayBuffer, bytes: Uint8Array): {
  rawPlayers: Record<string, string>[];
  gameLengthMs: number;
  gameVersion: string;
  rawBans?: { team1: string[]; team2: string[] };
} {
  const view = new DataView(buffer);

  let metaOffset = 0;
  let metaLength = 0;
  for (const magicLen of [18, 17, 16]) {
    const base = magicLen + 256;
    if (base + 14 > buffer.byteLength) continue;
    const off = view.getUint32(base + 2, true);
    const len = view.getUint32(base + 6, true);
    if (off > 0 && off < buffer.byteLength && len > 10 && off + len <= buffer.byteLength) {
      metaOffset = off;
      metaLength = len;
      break;
    }
  }

  if (!metaOffset) {
    throw new Error("ROFL 1.x: 메타데이터 위치를 찾을 수 없습니다.");
  }

  const metaText = new TextDecoder("utf-8", { fatal: false }).decode(
    bytes.subarray(metaOffset, metaOffset + metaLength)
  );

  const meta: Record<string, unknown> = JSON.parse(metaText);
  if (typeof meta.statsJson !== "string") {
    throw new Error("ROFL 1.x: statsJson 필드가 없습니다.");
  }

  const rawBans = extractBansFromTeams(meta.teams);

  return {
    rawPlayers: JSON.parse(meta.statsJson as string),
    gameLengthMs: (meta.gameLength as number) ?? 0,
    gameVersion: (meta.gameVersion as string) ?? "",
    rawBans,
  };
}

// ─── ROFL 2.x 파서 (RIOT\x02\x00 binary header) ─────────────────────────
function scanFormat(bytes: Uint8Array): {
  rawPlayers: Record<string, string>[];
  gameLengthMs: number;
  gameVersion: string;
  rawBans?: { team1: string[]; team2: string[] };
} {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  const KEY = '"statsJson"';
  const keyIdx = text.indexOf(KEY);
  if (keyIdx === -1) {
    throw new Error(
      "statsJson 데이터를 찾을 수 없습니다.\n" +
      "커스텀 게임 리플레이인지 확인해주세요."
    );
  }

  let pos = keyIdx + KEY.length;
  while (pos < text.length && (text[pos] === ":" || text[pos] === " " || text[pos] === "\t")) pos++;

  let rawPlayers: Record<string, string>[];

  if (text[pos] === '"') {
    pos++;
    let buf = "";
    while (pos < text.length) {
      const ch = text[pos];
      if (ch === "\\") {
        pos++;
        const esc = text[pos];
        if (esc === '"') buf += '"';
        else if (esc === "\\") buf += "\\";
        else if (esc === "n") buf += "\n";
        else if (esc === "r") buf += "\r";
        else if (esc === "t") buf += "\t";
        else buf += esc;
      } else if (ch === '"') {
        break;
      } else {
        buf += ch;
      }
      pos++;
    }
    rawPlayers = JSON.parse(buf);
  } else if (text[pos] === "[") {
    let depth = 0;
    const start = pos;
    while (pos < text.length) {
      if (text[pos] === "[") depth++;
      else if (text[pos] === "]") { depth--; if (depth === 0) { pos++; break; } }
      pos++;
    }
    rawPlayers = JSON.parse(text.slice(start, pos));
  } else {
    throw new Error("statsJson 값 형식을 인식할 수 없습니다.");
  }

  const glMatch = text.match(/"gameLength"\s*:\s*(\d+)/);
  const gameLengthMs = glMatch ? parseInt(glMatch[1]) : 0;

  const gvMatch = text.match(/"gameVersion"\s*:\s*"([^"]+)"/);
  const gameVersion = gvMatch ? gvMatch[1] : "";

  const rawBans = scanTeamsFromText(text);

  return { rawPlayers, gameLengthMs, gameVersion, rawBans };
}

// ─── 메인 파서 ──────────────────────────────────────────────────────────────
export async function parseRofl(file: File): Promise<RoflParseResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (buffer.byteLength < 100) {
    throw new Error("파일이 너무 작습니다. 완전히 다운로드된 .rofl 파일인지 확인해주세요.");
  }

  const prefix = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 10));

  let rawPlayers: Record<string, string>[];
  let gameLengthMs: number;
  let gameVersion: string;
  let rawBans: { team1: string[]; team2: string[] } | undefined;

  if (prefix.startsWith("RIOT:ROFL:")) {
    ({ rawPlayers, gameLengthMs, gameVersion, rawBans } = parseClassicFormat(buffer, bytes));
  } else if (prefix.startsWith("RIOT")) {
    ({ rawPlayers, gameLengthMs, gameVersion, rawBans } = scanFormat(bytes));
  } else {
    const hexDump = Array.from(bytes.subarray(0, 16))
      .map(b => b.toString(16).padStart(2, "0"))
      .join(" ");
    throw new Error(
      `지원되지 않는 파일 형식입니다.\n파일 시작 바이트(hex): ${hexDump}\nLoL 클라이언트 전적 탭에서 다운로드한 파일인지 확인해주세요.`
    );
  }

  if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
    throw new Error("플레이어 데이터가 비어 있습니다.");
  }

  let gameDurationSeconds = Math.round(gameLengthMs / 1000);
  if (gameDurationSeconds === 0 && rawPlayers[0]?.TIME_PLAYED) {
    gameDurationSeconds = parseInt(rawPlayers[0].TIME_PLAYED) || 0;
  }

  // Data Dragon에서 챔피언 이름 맵 로드 (플레이어 이름 한국어 변환 + 밴 ID 변환)
  const champMaps = await getChampionMaps();

  const allPlayers = rawPlayers.map(p => {
    const player = buildPlayer(p);
    // 영문 내부명 → 한국어 이름 변환 (예: "Syndra" → "신드라")
    player.champion = champMaps.byName[player.champion] ?? player.champion;
    return player;
  });
  const team1 = sortByPosition(allPlayers.filter(p => p.team === 1));
  const team2 = sortByPosition(allPlayers.filter(p => p.team === 2));
  const winTeam: 1 | 2 = allPlayers.find(p => p.win)?.team ?? 1;

  // 밴 ID → 챔피언 이름 변환
  const bans = rawBans ? await resolveChampionIds(rawBans) : undefined;

  return { gameVersion, gameDurationSeconds, winTeam, team1, team2, bans };
}

// ─── Riot ID ↔ 닉네임 매핑 ─────────────────────────────────────────────────
const MAPPING_KEY = "riot_id_mappings_v1";

export function loadRiotMappings(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(MAPPING_KEY) ?? "{}"); }
  catch { return {}; }
}

export function saveRiotMappings(mappings: Record<string, string>): void {
  localStorage.setItem(MAPPING_KEY, JSON.stringify(mappings));
}
