import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

async function getLatestChampions() {
  try {
    // 롤 공식 패치 노트 최신 버전 가져오기 (매 24시간마다 캐시 갱신)
    const vRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", { next: { revalidate: 86400 } });
    const versions = await vRes.json();
    const latest = versions[0];
    // 해당 버전의 한국어 챔피언 전체 데이터 가져오기
    const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/\${latest}/data/ko_KR/champion.json`, { next: { revalidate: 86400 } });
    const cData = await cRes.json();
    // 데이터 구조에서 챔피언 이름만 전부 뽑아서 콤마 텍스트로 합침
    const names = Object.values(cData.data).map((c: any) => c.name);
    return names.join(", ");
  } catch (err) {
    console.error("챔피언 최신 목록 불러오기 실패, 기본값 사용", err);
    // 통신 오류 시 기본 168챔피언 반환 (안전장치)
    return "아트록스, 아리, 아칼리, 아크샨, 알리스타, 아무무, 애니비아, 애니, 아펠리오스, 애쉬, 아우렐리온 솔, 아지르, 바드, 벨베스, 블리츠크랭크, 브랜드, 브라움, 브라이어, 케이틀린, 카밀, 카시오페아, 초가스, 코르키, 다리우스, 다이애나, 드레이븐, 문도 박사, 에코, 엘리스, 이블린, 이즈리얼, 피들스틱, 피오라, 피즈, 갈리오, 갱플랭크, 가렌, 나르, 그라가스, 그레이브즈, 그웬, 헤카림, 하이머딩거, 흐웨이, 일라오이, 이렐리아, 아이번, 잔나, 자르반 4세, 잭스, 제이스, 진, 징크스, 카이사, 칼리스타, 카르마, 카서스, 카사딘, 카타리나, 케일, 케인, 케넨, 카직스, 킨드레드, 클레드, 코그모, 크산테, 르블랑, 리 신, 레오나, 릴리아, 리산드라, 루시안, 룰루, 럭스, 말파이트, 말자하, 마오카이, 마스터 이, 밀리오, 미스 포츈, 오공, 모데카이저, 모르가나, 나피리, 나미, 나서스, 노틸러스, 니코, 니달리, 닐라, 녹턴, 누누와 윌럼프, 올라프, 오리아나, 오른, 판테온, 뽀삐, 파이크, 키아나, 퀸, 라칸, 람머스, 렉사이, 렐, 레나타 글라스크, 레넥톤, 렝가, 리븐, 럼블, 라이즈, 사미라, 세주아니, 세나, 세라핀, 세트, 샤코, 쉔, 쉬바나, 신지드, 사이온, 시비르, 스카너, 스몰더, 소나, 소라카, 스웨인, 사일러스, 신드라, 탐 켄치, 탈리야, 탈론, 타릭, 티모, 쓰레쉬, 트리스타나, 트런들, 트린다미어, 트위스티드 페이트, 트위치, 우디르, 우르곳, 바루스, 베인, 베이가, 벨코즈, 벡스, 바이, 비에고, 빅토르, 블라디미르, 볼리베어, 워윅, 자야, 제라스, 신 짜오, 야스오, 요네, 요릭, 유미, 자크, 제드, 제리, 직스, 질리언, 조이, 자이라, 오로라";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { base64, mediaType, date, gameFormat, gameNumber } = await request.json();

    if (!base64 || !mediaType) {
      return Response.json({ error: "이미지 데이터가 없습니다." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(apiKey)) {
      return Response.json(
        { error: "API 키가 올바르지 않습니다. .env.local 파일에 실제 ANTHROPIC_API_KEY(영문/숫자)를 설정 후 서버를 재시작해주세요." },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // 실시간 최신 롤 챔피언 문자열 가져오기
    const championList = await getLatestChampions();

    const contextInfo = [
      gameFormat ? `🎮 시리즈 형식: ${gameFormat} (${gameFormat === "3판2선" ? "2승 선취" : "3승 선취"})` : "",
      gameNumber ? `📍 이번 경기: ${gameFormat || ""} 시리즈 ${gameNumber}번째 경기` : "",
    ]
      .filter(Boolean)
      .join("\\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "당신은 리그 오브 레전드(LoL) 내전 게임 결과 판독기입니다. 아래의 규칙을 엄격하게 지키세요.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `이 이미지는 리그 오브 레전드(LoL) 내전 게임의 결산 스크린샷입니다.

${contextInfo ? `[경기 정보]\n${contextInfo}\n\n` : ""}다음 내용을 분석하여 반드시 오직 JSON 구조로만 반환하세요. 다른 텍스트는 절대 안 됩니다.

{
  "date": "2026-06-03",
  "winTeam": 1,
  "team1": [
    { "nickname": "유저닉네임1", "champion": "가렌", "kills": 5, "deaths": 3, "assists": 7 },
    ... 5명
  ],
  "team2": [
    { "nickname": "유저닉네임6", "champion": "리신", "kills": 2, "deaths": 6, "assists": 4 },
    ... 5명
  ],
  "bans": {
    "team1": ["야스오", "제드", "케인", "아크샨", "르블랑"],
    "team2": ["이즈리얼", "진", "카이사", "아펠리오스", "바루스"]
  }
}

주의사항 (반드시 지킬 것!):
1. **[중요] 승패 판정 기준**: 화면 상단에 **"승리"** 또는 **"패배"** 텍스트가 표시됩니다. **"승리"라고 적혀있으면 위쪽 팀(team1)이 이긴 것이므로 "winTeam": 1**, **"패배"라고 적혀있으면 위쪽 팀(team1)이 진 것이므로 아래쪽 팀(team2)이 이긴 "winTeam": 2** 로 판정하세요. 골드, KDA, 화면 색상으로 절대 판단하지 마세요. 오직 "승리"/"패배" 텍스트로만 결정하세요.
2. 챔피언 인식: 초상화의 색감 눈코입, 들고있는 무기, 얼굴 형태를 꼼꼼히 살핀 후 아래의 [롤 챔피언 공식 목록] 내에서만 가장 일치하는 이름 한 개를 골라서 적어주세요. 텍스트가 없으므로 생김새 이미지만으로 최선을 다해 유추하세요. 이 목록에 없는 이름을 지어내면 시스템이 고장납니다.
[롤 챔피언 공식 목록]: ${championList}
3. team1은 명백한 화면 왼쪽이나 위쪽 진영, team2는 화면 오른쪽이나 아래쪽 진영 플레이어 5인입니다.
4. KDA(킬/데스)는 무관하므로 분석하지 마세요.
5. **KDA 추출**: 각 플레이어의 킬/데스/어시스트(K/D/A) 숫자를 kills, deaths, assists 필드에 넣으세요. 예: "12/3/11" → kills:12, deaths:3, assists:11. 숫자를 읽을 수 없으면 해당 필드를 0으로 넣으세요.
6. **date 추출**: 화면에 표시된 경기 날짜를 읽어 반드시 **"YYYY-MM-DD"** 형식으로 변환해 date 필드에 넣으세요. 날짜를 찾을 수 없으면 빈 문자열 ""을 넣으세요.
6. **bans 추출**: 화면 오른쪽의 "선택 금지" 영역에 팀별 밴 챔피언 아이콘이 표시됩니다. 위쪽 팀(team1)의 밴 5개를 bans.team1에, 아래쪽 팀(team2)의 밴 5개를 bans.team2에 넣으세요. 챔피언 이름은 위의 [롤 챔피언 공식 목록]에서만 선택하세요. 아이콘이 보이지 않거나 판별 불가능한 경우 빈 배열 []을 넣으세요.
7. 오직 유효한 영문 key를 가진 순수 JSON 문자열만 응답하세요.`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return Response.json({ error: "분석 결과를 가져오지 못했습니다." }, { status: 500 });
    }

    const text = content.text;
    
    // JSON 추출
    let parsedData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(text);
      }
    } catch (e) {
      console.error("JSON 파싱 에러:", text);
      return Response.json({ error: "AI가 올바른 형식의 데이터를 반환하지 않았습니다." }, { status: 500 });
    }

    return Response.json(parsedData);
  } catch (err: unknown) {
    console.error("Analysis error:", err);

    if (err && typeof err === "object" && "status" in err) {
      const apiErr = err as { status: number };
      if (apiErr.status === 401) return Response.json({ error: "API 키가 유효하지 않습니다." }, { status: 401 });
      if (apiErr.status === 429) return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
      if (apiErr.status === 413) return Response.json({ error: "이미지 파일이 너무 큽니다." }, { status: 413 });
    }

    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
