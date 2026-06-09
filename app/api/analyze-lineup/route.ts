import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { base64, mediaType } = await request.json();

    if (!base64 || !mediaType) {
      return Response.json({ error: "이미지 데이터가 없습니다." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "API 키가 설정되지 않았습니다. .env.local 파일에 ANTHROPIC_API_KEY를 설정해주세요." },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 512,
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
              text: `이 이미지는 리그 오브 레전드(LoL) 게임의 화면입니다.

이미지에서 플레이어 닉네임을 읽어주세요.
화면에 나타나는 순서 그대로 위에서 아래로:
1번째 = 탑
2번째 = 정글
3번째 = 미드
4번째 = 원딜
5번째 = 서포터

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력하세요:
[
  {"position": "탑", "nickname": "닉네임1"},
  {"position": "정글", "nickname": "닉네임2"},
  {"position": "미드", "nickname": "닉네임3"},
  {"position": "원딜", "nickname": "닉네임4"},
  {"position": "서포터", "nickname": "닉네임5"}
]

만약 읽을 수 없는 닉네임이 있으면 "알수없음"으로 처리하세요.
양 팀이 모두 보이면 블루팀(왼쪽/위쪽) 기준으로 추출하세요.`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return Response.json({ error: "분석 결과를 가져오지 못했습니다." }, { status: 500 });
    }

    // JSON 파싱 시도
    const text = content.text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return Response.json({ error: "라인업 정보를 인식하지 못했습니다. 게임 화면 캡쳐인지 확인해주세요." }, { status: 422 });
    }

    const lineup = JSON.parse(jsonMatch[0]) as { position: string; nickname: string }[];
    return Response.json({ lineup });
  } catch (err: unknown) {
    console.error("Lineup analysis error:", err);

    if (err instanceof SyntaxError) {
      return Response.json({ error: "분석 결과 형식 오류. 다시 시도해주세요." }, { status: 422 });
    }

    if (err && typeof err === "object" && "status" in err) {
      const apiErr = err as { status: number };
      if (apiErr.status === 401) {
        return Response.json({ error: "API 키가 유효하지 않습니다." }, { status: 401 });
      }
      if (apiErr.status === 429) {
        return Response.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
      }
    }

    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return Response.json({ error: message }, { status: 500 });
  }
}
