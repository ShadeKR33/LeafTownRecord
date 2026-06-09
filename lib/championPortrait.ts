// 챔피언 한국어 이름 → Community Dragon 고화질 초상화 URL 변환
// Community Dragon: 120×120 고화질, API 키 불필요, 무료 공개 CDN

let _map: Map<string, string> | null = null;  // koreanName → numericId
let _promise: Promise<void> | null = null;

function init(): Promise<void> {
  if (_promise) return _promise;
  _promise = (async () => {
    try {
      const versions: string[] = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json",
        { cache: "force-cache" }
      ).then(r => r.json());

      const version = versions[0];
      const data = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`,
        { cache: "force-cache" }
      ).then(r => r.json());

      _map = new Map();
      Object.values(data.data).forEach((c: unknown) => {
        const champ = c as { name: string; key: string };
        // 한국어 이름 → 숫자 ID (Community Dragon에서 사용)
        _map!.set(champ.name, champ.key);
        // 띄어쓰기 없는 버전도 등록
        _map!.set(champ.name.replace(/\s/g, ""), champ.key);
      });
    } catch {
      _map = new Map();
    }
  })();
  return _promise;
}

export async function getPortraitUrl(koreanName: string): Promise<string | null> {
  await init();
  if (!_map) return null;

  const numericId = _map.get(koreanName) ?? _map.get(koreanName.replace(/\s/g, ""));
  if (!numericId) return null;

  // Community Dragon — 120×120 고화질 사각형 아이콘
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${numericId}.png`;
}
