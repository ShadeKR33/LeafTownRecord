import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUser } from "@/lib/kvGroups";

const POSITIONS = ["탑", "정글", "미드", "원딜", "서포터"];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const userData = await getUser(session.user.id);
    if (!userData || userData.role === "viewer") {
      return Response.json({ error: "뷰어 권한으로는 분석을 수행할 수 없습니다." }, { status: 403 });
    }

    const { base64, mediaType, statsBase64, statsMediaType } = await request.json();

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

    const hasStatsImage = !!(statsBase64 && statsMediaType);

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
            ...(hasStatsImage ? [{
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: statsMediaType,
                data: statsBase64,
              },
            }] : []),
            {
              type: "text",
              text: `두 이미지는 모두 리그 오브 레전드(LoL) 내전 게임의 "통계" 탭 스크린샷입니다. 두 이미지 모두 플레이어 10명의 칸이 좌측 5칸, 우측 5칸으로 가로로 나열되어 있고, 좌측 5칸은 항상 "1팀"(서포터, 원딜, 미드, 정글, 탑 순서), 우측 5칸은 항상 "2팀"(탑, 정글, 미드, 원딜, 서포터 순서)입니다. 두 이미지의 칸 순서(좌→우)는 서로 동일한 선수를 가리킵니다.

첫 번째 이미지에는 승패 정보, 각 선수의 KDA(킬/데스/어시스트), "챔피언에게 가한 피해량"이 표시되어 있습니다.${hasStatsImage ? "\n두 번째 이미지에는 각 선수의 \"받은 피해량\"(또는 \"적에게 받은 피해량\"), \"시야 점수\", \"CS\"(미니언 처치 수), \"제어와드 구매\" 개수가 표시되어 있습니다." : ""}

다음 내용을 분석하여 반드시 오직 JSON 구조로만 반환하세요. 다른 텍스트는 절대 안 됩니다.

{
  "winTeam": 1,
  "gameDurationMinutes": 32,
  "gameDurationSeconds": 15,
  "cells": [
    { "kills": 5, "deaths": 3, "assists": 7, "damageDealt": 12000${hasStatsImage ? `, "damageTaken": 24000, "visionScore": 32, "cs": 180, "controlWardsBought": 3` : ""} },
    ... 총 10개, 첫 번째 이미지의 좌→우 순서대로
  ]
}

주의사항 (반드시 지킬 것!):
1. **[중요] 승패 판정 기준**: 첫 번째 이미지에서 주황색(노란색) 테두리로 강조된 칸(본인 계정)이 좌측 5칸 중에 있는지, 우측 5칸 중에 있는지 확인하고, 화면에 표시된 "승리" 또는 "패배" 텍스트를 확인하세요.
   - 주황 테두리가 좌측에 있고 "승리"이면 winTeam: 1
   - 주황 테두리가 우측에 있고 "승리"이면 winTeam: 2
   - 주황 테두리가 좌측에 있고 "패배"이면 winTeam: 2
   - 주황 테두리가 우측에 있고 "패배"이면 winTeam: 1
   골드, KDA, 화면 색상으로 절대 판단하지 마세요. 오직 주황 테두리 위치 + "승리"/"패배" 텍스트로만 결정하세요.
2. **KDA 추출**: 각 선수의 킬/데스/어시스트(K/D/A) 숫자를 kills, deaths, assists 필드에 넣으세요. 예: "12/3/11" → kills:12, deaths:3, assists:11. 숫자를 읽을 수 없으면 해당 필드를 0으로 넣으세요.
3. **챔피언에게 가한 피해량**: 첫 번째 이미지에서 각 선수의 "챔피언에게 가한 피해량"을 정수로 읽어 damageDealt에 넣으세요.
4. **게임 시간**: 두 이미지 중 어느 쪽이든 좌측 상단(왼쪽 위 모서리)에 표시된 경기 시간(예: "32:15" 등 mm:ss 형식)을 찾아 분을 gameDurationMinutes, 초를 gameDurationSeconds에 정수로 넣으세요. 이 값은 각 선수의 CS를 분당 CS로 환산하는 데 사용되므로 정확하게 읽어야 합니다. 두 이미지 모두에서 찾을 수 없으면 둘 다 0으로 넣으세요.${hasStatsImage ? `
5. **받은 피해량 / 시야 점수 / CS**: 두 번째 이미지에서 같은 칸 순서로 "받은 피해량"(또는 "적에게 받은 피해량")을 damageTaken에, "시야 점수"를 visionScore에 정수로 넣으세요.
   **CS 계산 (매우 중요, 절대 누락 금지)**: CS 칸 옆이나 아래에 아이콘과 함께 숫자가 두 개 나란히 표시되어 있을 수 있습니다 — 하나는 "미니언(병사) 처치 수", 다른 하나는 "중립 미니언(정글 몬스터) 처치 수"입니다. **반드시 두 숫자를 모두 찾아서 더한 값**을 cs에 넣으세요. 절대로 둘 중 하나만(특히 미니언 처치 수만) 넣지 마세요.
   - 예: 미니언 처치 165 + 중립 미니언 처치 15 = cs: 180
   - 특히 **정글(POSITIONS[1]) 포지션 플레이어는 CS의 대부분이 중립 미니언(몬스터) 처치에서 나옵니다.** 정글 플레이어의 cs 값이 게임 시간에 비해 비정상적으로 낮게(예: 30분 게임에 cs 30~40 수준) 나온다면, 중립 미니언 처치 수를 빠뜨렸을 가능성이 매우 높으니 두 숫자를 모두 다시 확인하세요.
6. **제어와드 구매**: 두 번째 이미지에서 "제어와드 구매"(또는 이와 비슷한 표기)로 표시된 개수를 정수로 읽어 controlWardsBought에 넣으세요. 찾을 수 없으면 0으로 넣으세요.
7. 오직 유효한 영문 key를 가진 순수 JSON 문자열만 응답하세요.` : `
5. 오직 유효한 영문 key를 가진 순수 JSON 문자열만 응답하세요.`}`,
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

    const cells: any[] = Array.isArray(parsedData?.cells) ? parsedData.cells : [];
    const cellsLeft = cells.slice(0, 5);
    const cellsRight = cells.slice(5, 10);

    const toPlayer = (cell: any, pos: string) => ({
      nickname: "",
      champion: "",
      position: pos,
      kills: typeof cell?.kills === "number" ? cell.kills : 0,
      deaths: typeof cell?.deaths === "number" ? cell.deaths : 0,
      assists: typeof cell?.assists === "number" ? cell.assists : 0,
      ...(typeof cell?.damageDealt === "number" ? { damageDealt: cell.damageDealt } : {}),
      ...(typeof cell?.damageTaken === "number" ? { damageTaken: cell.damageTaken } : {}),
      ...(typeof cell?.visionScore === "number" ? { visionScore: cell.visionScore } : {}),
      ...(typeof cell?.cs === "number" ? { cs: cell.cs } : {}),
      ...(typeof cell?.controlWardsBought === "number" ? { controlWardsBought: cell.controlWardsBought } : {}),
    });

    // 좌측 5칸은 서포터→탑 순이므로 뒤집으면 탑→서포터(POSITIONS) 순서가 된다.
    const team1 = [...cellsLeft].reverse().map((cell, i) => toPlayer(cell, POSITIONS[i]));
    // 우측 5칸은 이미 탑→서포터(POSITIONS) 순서이다.
    const team2 = cellsRight.map((cell, i) => toPlayer(cell, POSITIONS[i]));

    const durationMinutes = typeof parsedData?.gameDurationMinutes === "number" ? parsedData.gameDurationMinutes : 0;
    const durationSeconds = typeof parsedData?.gameDurationSeconds === "number" ? parsedData.gameDurationSeconds : 0;
    const gameDuration = durationMinutes + durationSeconds / 60;

    return Response.json({
      winTeam: parsedData?.winTeam === 2 ? 2 : 1,
      ...(gameDuration > 0 ? { gameDuration } : {}),
      team1,
      team2,
    });
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
