# 나뭇잎 마을 내전 기록소 — 코드 이해 문서

> 리그 오브 레전드 내전 기록을 자동화하는 그룹 관리 웹 서비스  
> 배포 URL: https://leaf-town-records.vercel.app

---

## 1. 프로젝트 개요

### 만든 이유

친구들과 롤 내전을 하면서 기록을 카카오톡으로 수동 관리했습니다. 승패·KDA·챔피언 통계를 따로 정리할 방법이 없어 기억에만 의존하는 상황이었습니다. 결과 화면 캡쳐 한 장만 올리면 모든 기록이 자동 저장되고, 누가 얼마나 잘하는지 통계로 볼 수 있는 서비스를 직접 만들었습니다. **실제로 3개월 이상 친구들과 사용 중입니다.**

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 📸 AI 캡쳐 분석 | 게임 결과 화면 이미지 → AI가 닉네임·챔피언·승패 자동 인식 |
| 🏆 랭킹 | KDA·승률·MVP 등 다양한 지표로 멤버 순위 자동 계산 + 45종 업적 시스템 |
| ⚔️ 챔피언 분석 | 포지션별 픽률·승률 기반 챔피언 티어 자동 배정 |
| 📅 달력 | 날짜별 내전 기록 조회 및 직접 입력 |
| 🎲 팀 편성 | 멤버 선택 후 미니게임으로 팀·사이드 결정 및 공유 |
| 🏕️ 그룹 관리 | 초대 링크 기반 멀티테넌트 그룹, 역할 기반 권한 관리 |

---

## 2. 기술 스택

| 분류 | 기술 | 선택 이유 |
|------|------|-----------|
| 프레임워크 | Next.js 16 (App Router) | 서버 컴포넌트로 초기 렌더링 최적화, API Route 통합으로 단일 레포 관리 |
| 언어 | TypeScript | 복잡한 통계·업적 타입을 명시해 런타임 오류 사전 차단 |
| 인증 | NextAuth.js v5 | Google OAuth 최소 설정으로 구현, JWT 세션 관리 |
| 데이터베이스 | Upstash Redis (KV) | 서버리스 환경에 최적화, 별도 DB 서버 불필요, JSON 직렬화로 유연한 스키마 |
| AI | Claude Sonnet Vision API | 이미지에서 구조화된 JSON 추출, 챔피언 목록 주입으로 환각 방지 |
| 외부 API | Riot Data Dragon | 최신 챔피언 목록 동적 로드, 신규 챔피언 패치 자동 대응 |
| 배포 | Vercel | Next.js 최적화 배포, 환경변수·CI/CD 일원화 |
| 스타일링 | Tailwind CSS + CSS Variables | 3가지 테마 전환을 CSS 변수 교체만으로 처리 |

---

## 3. 시스템 아키텍처

```
브라우저
  │
  ├── Next.js 16 — Vercel 서버리스 배포
  │     │
  │     ├── proxy.ts (라우트 보호)
  │     │     └── NextAuth authorized 콜백으로 미인증 접근 차단
  │     │
  │     ├── 서버 컴포넌트 (app/page.tsx 등)
  │     │     └── auth() 직접 호출 → 서버에서 세션 확인
  │     │
  │     ├── 클라이언트 컴포넌트
  │     │     └── useSession() → fetch('/api/...')
  │     │
  │     └── API Routes
  │           ├── /api/auth/[...nextauth]   ← Google OAuth 처리
  │           ├── /api/group                ← 그룹 CRUD + 해체
  │           ├── /api/group/members        ← 멤버 역할 관리
  │           ├── /api/group/invite         ← 초대 토큰 생성·조회·재생성
  │           ├── /api/group/restore        ← 데이터 복구 (긴급)
  │           ├── /api/db/records           ← 게임 기록 읽기·쓰기
  │           ├── /api/db/nicknames         ← 닉네임 읽기·쓰기
  │           └── /api/analyze              ← AI 캡쳐 분석
  │
  ├── Upstash Redis (KV)
  │     ├── lf:user:{id}                        ← 유저 정보 + 소속 groupId
  │     ├── lf:group:{id}                       ← 그룹 정보
  │     ├── lf:members:{groupId}                ← 그룹 멤버 목록
  │     ├── lf:invite:{token}                   ← 초대 토큰 → groupId 매핑
  │     ├── leaftown-game-records:{groupId}      ← 게임 기록 (그룹별 분리)
  │     └── leaftown-nicknames:{groupId}         ← 닉네임·티어 정보 (그룹별 분리)
  │
  └── 외부 서비스
        ├── Google OAuth 2.0 (인증)
        ├── Claude Sonnet Vision API (캡쳐 분석)
        └── Riot Data Dragon API (챔피언 목록)
```

---

## 4. 인증 구조 (NextAuth v5)

### Google OAuth 흐름

```
사용자 → /login → Google 로그인
  → NextAuth JWT 콜백 실행
  → token.sub(Google 고유 ID)로 KV에 유저 생성/조회
  → JWT에 uid·groupId·role 저장
  → 세션 생성 완료
```

### JWT 콜백의 핵심 설계

```typescript
async jwt({ token, user }) {
  if (user) {
    const userId = token.sub!;  // user.id 아닌 token.sub 사용
    // → Google OAuth에서 user.id는 일부 케이스에서 undefined 반환
    // → token.sub는 항상 존재 (Google 사용자 고유 식별자)
    const userData = await getOrCreateUser({ id: userId, ... });
    token.uid = userId;
    token.groupId = userData.groupId;
  }
  return token;
}
```

### 라우트 보호 (Next.js 16 방식)

Next.js 16은 `middleware.ts` 대신 `proxy.ts`를 사용합니다.

```typescript
// proxy.ts
export { auth as proxy } from "./auth";
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)"],
};

// auth.ts authorized 콜백
authorized({ auth: session, request: { nextUrl } }) {
  if (nextUrl.pathname.startsWith("/api/")) return true;  // API 자체 인증
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/invite/")) return true;
  if (!session?.user) return false;  // 미인증 → /login 리다이렉트
  return true;
}
```

---

## 5. 멀티테넌트 설계

### 핵심 원칙: 세션을 믿지 않고 KV를 직접 조회

JWT 세션의 `groupId`가 갱신 타이밍 이슈로 stale할 수 있어, **모든 API Route가 매 요청마다 KV에서 최신 groupId를 직접 조회**합니다.

```typescript
// 모든 데이터 API의 공통 패턴
export async function GET() {
  const session = await auth();
  const userData = await getUser(session.user.id);   // ← KV 직접 조회
  if (!userData?.groupId) return NextResponse.json({ records: [] });
  const records = await kv.get(recordsKey(userData.groupId));
  return NextResponse.json({ records });
}
```

### KV 키 네이밍 전략

그룹별 데이터 완전 분리를 위해 모든 데이터 키에 `groupId` 포함:

```
lf:user:{userId}                      ← 유저별 단일 레코드
lf:group:{groupId}                    ← 그룹 메타데이터
lf:members:{groupId}                  ← 멤버 배열
lf:invite:{token}                     ← 초대 토큰 → groupId 역참조
leaftown-game-records:{groupId}       ← 게임 기록 배열
leaftown-nicknames:{groupId}          ← 닉네임 배열
```

### 초대 시스템

```typescript
// 그룹 생성 시 UUID 토큰 발급
const inviteToken = crypto.randomUUID();
await kv.set(`lf:invite:${inviteToken}`, groupId);

// 초대 링크: https://leaf-town-records.vercel.app/invite/{token}
// 미로그인 → 로그인 후 자동 그룹 참여
// 토큰 재생성 → 기존 링크 즉시 무효화
```

---

## 6. AI 캡쳐 분석

### 처리 흐름

```
게임 결과 화면 캡쳐 업로드 (여러 장 가능)
  → /api/analyze 로 전송
  → Riot Data Dragon에서 최신 챔피언 목록 로드
  → Claude Vision API 호출 (이미지 + 챔피언 목록 주입)
  → JSON 파싱 (닉네임·챔피언·승패)
  → 검수 화면 (사용자가 오류 수정)
  → 확정 저장 → KV에 기록
```

### 핵심 프롬프트 설계

AI 환각(hallucination) 방지를 위한 두 가지 제약:

```typescript
// 1. 승패 판정: 색조 기반 (KDA로 판단 금지)
"화면 전체의 지배적인 색상이 파란색이면 winTeam: 1,
 붉은색이면 winTeam: 2. KDA로 판단하지 말 것."

// 2. 챔피언 인식: 공식 목록 내에서만
"아래 [챔피언 공식 목록] 내에서만 이름을 선택하세요.
 이 목록에 없는 이름을 지어내면 시스템이 고장납니다."

// 3. 응답 형식 강제
"오직 순수 JSON 문자열만 응답하세요."
```

### 챔피언 목록 동적 로드

```typescript
const versions = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
const latest = versions[0];  // 항상 최신 패치
const champions = await fetch(
  `https://ddragon.leagueoflegends.com/cdn/${latest}/data/ko_KR/champion.json`
);
// 신규 챔피언 패치 시 코드 수정 없이 자동 대응
```

---

## 7. 통계·업적 시스템

### 다전제 집계 설계 (`lib/stats.ts`)

단판 기록을 날짜별로 묶어 시리즈를 구성합니다. **완료된 시리즈만 통계에 반영**해 신뢰도를 보장합니다.

```typescript
// 3판2선: 선취 2승, 5판3선: 선취 3승
const needed = format === "3판2선" ? 2 : 3;
if (t1Wins >= needed || t2Wins >= needed) {
  series.isComplete = true;
}
// 완료되지 않은 시리즈(도중 중단)는 통계 제외
```

### 업적 시스템 (45종 5등급)

```
신화 (1종) — 극히 드문 조건
전설 (7종) — 고난도 달성
영웅 (17종) — 중난도
희귀 (17종) — 접근 가능
일반 (3종) — 진입 업적
```

업적은 `computeBadges()` 함수가 통계 객체를 받아 자동 계산합니다. 연승·연패, 챔피언별 성과, 특정 파트너와의 조합 승수 등 다양한 조건을 사용합니다.

### 닉네임 통합 처리

닉네임 변경 이력·대소문자 차이·부계정을 같은 사람으로 합산하기 위해 변환 레이어를 구축했습니다.

```typescript
// 모든 닉네임 → 실명으로 매핑하는 Map 생성
const dnMap = new Map<string, string>();
nicknameEntries.forEach(e => {
  const displayName = e.realName || e.nickname;
  dnMap.set(normalizeId(e.nickname), displayName);
  e.altNicknames?.forEach(alt => dnMap.set(normalizeId(alt), displayName));
});
// vsStats·withStats 키를 실명으로 저장 → 부계정이 모두 같은 사람으로 합산
```

---

## 8. 테마 시스템

퀴즈(5문항) 결과에 따라 3가지 테마가 자동 추천됩니다.

```
나뭇잎 마을 (초록) — 팀워크·꾸준함 중시 유형
비 마을 (보라)     — 전략·분석 중시 유형
아카츠키 (빨강)    — 승리·압도 중시 유형
```

CSS 변수 교체로 구현하여 테마 전환이 리렌더링 없이 즉시 적용됩니다.

```css
:root       { --accent: #2A5C1E; --bg: #0d1b0f; }  /* 나뭇잎 */
.ame-mode   { --accent: #9d92d4; --bg: #0f0f1a; }  /* 비 마을 */
.aka-mode   { --accent: #c93b3b; --bg: #1a0a0a; }  /* 아카츠키 */
```

타 컴포넌트(Navigation)에 테마 변경을 알리기 위해 `localStorage` 이벤트 대신 `CustomEvent`를 사용합니다. `localStorage.setItem`은 같은 탭에서 `storage` 이벤트를 발생시키지 않기 때문입니다.

```typescript
// 테마 변경 시
localStorage.setItem("theme", themeId);
window.dispatchEvent(new CustomEvent("themechange", { detail: themeId }));

// Navigation에서 수신
window.addEventListener("themechange", (e) => setTheme(e.detail));
```

---

## 9. 트러블슈팅

### 🐛 #1 그룹 생성 후 화면이 업데이트되지 않음

**증상**: 그룹 생성 API가 200을 반환했지만 페이지가 여전히 그룹 생성 폼을 보여줌

**원인 1**: Google OAuth에서 `user.id`가 일부 케이스에서 undefined를 반환 → JWT에 `uid = undefined` 저장 → 이후 세션 갱신 트리거가 작동하지 않음

**원인 2**: NextAuth v5의 `update()` 트리거가 JWT를 즉시 갱신하지 않아 `session.user.groupId`가 null로 유지됨

**해결**:
```typescript
// Before: user.id 사용 (일부 케이스에서 undefined)
token.uid = user.id;

// After: token.sub 사용 (Google OAuth에서 항상 존재)
token.uid = token.sub!;

// 근본 해결: 세션 groupId 신뢰 X → 모든 API가 KV 직접 조회
const userData = await getUser(session.user.id);  // 항상 최신값
```

---

### 🐛 #2 새 계정 그룹 생성 시 다른 그룹 데이터가 복사되는 현상

**증상**: 새로 만든 계정에서 그룹을 생성했더니 기존 그룹의 게임 기록이 그대로 보임

**원인**: 레거시 데이터 마이그레이션 함수가 플랫 키에 데이터가 없으면 KV 전체를 SCAN해서 다른 그룹의 데이터 키를 "고아 키"로 오판해 새 그룹에 복사

```typescript
// 문제 코드: SCAN으로 다른 그룹 데이터를 찾아 복사
const [, rKeys] = await kv.scan(0, { match: "leaftown-game-records:*" });
const orphan = rKeys.find(k => k !== targetRecords);
if (orphan) records = await kv.get(orphan);  // 다른 그룹 데이터 오염 ❌

// 수정: 레거시 플랫 키만 확인 (SCAN 폴백 제거)
const records = await kv.get("leaftown-game-records");  // 플랫 키만 ✅
if (Array.isArray(records) && records.length > 0) {
  await kv.set(targetRecords, records);
}
```

---

### 🐛 #3 테마 변경 후 Navigation의 테마 이름이 업데이트되지 않음

**증상**: 퀴즈에서 아카츠키 테마가 선택되면 화면 색상은 바뀌지만 우측 상단 테마 선택 버튼은 여전히 "나뭇잎 마을"로 표시됨

**원인**: `localStorage.setItem()`은 같은 탭에서 `storage` 이벤트를 발생시키지 않아 Navigation 컴포넌트의 React state가 업데이트되지 않음

**해결**: `CustomEvent`를 dispatch해서 Navigation에 직접 알림

```typescript
// manage/page.tsx (퀴즈 결과 처리)
localStorage.setItem("theme", winner);
window.dispatchEvent(new CustomEvent("themechange", { detail: winner }));

// Navigation.tsx (이벤트 수신)
window.addEventListener("themechange", (e) => {
  setTheme((e as CustomEvent<ThemeId>).detail);
});
```

---

### 🐛 #4 isAdmin 판정 오류로 관리자 기능이 표시되지 않음

**증상**: 그룹 생성자(관리자)임에도 멤버 역할 변경, 그룹 해체 버튼이 보이지 않음

**원인**: `session.user.role`(JWT에서 오는 값)이 stale해서 그룹 생성 직후 "admin"으로 갱신되지 않음

**해결**: KV에서 직접 가져온 `members` 배열로 관리자 여부를 판단

```typescript
// Before: JWT 세션 신뢰 (stale 가능성)
const isAdmin = session?.user?.role === "admin";

// After: KV에서 직접 가져온 members 배열로 판단
const isAdmin = members.some(
  m => m.userId === session?.user?.id && m.role === "admin"
);
```

---

## 10. 폴더 구조

```
/
├── app/
│   ├── page.tsx              # 랜딩 (그룹 여부에 따라 /ranking 또는 /manage 리다이렉트)
│   ├── login/                # Google 로그인
│   ├── invite/[token]/       # 초대 링크 처리 (로그인 후 자동 그룹 참여)
│   ├── ranking/              # 랭킹 + 업적 모달
│   ├── champion/             # 챔피언 분석
│   ├── calendar/             # 달력
│   ├── analysis/             # AI 캡쳐 분석
│   ├── team/                 # 팀 편성 + 사이드 결정 미니게임
│   ├── manage/               # 마을 관리 (멤버·그룹 탭)
│   ├── guide/                # 사용 가이드
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── group/            # 그룹 CRUD + 해체 + 복구
│       ├── db/records/       # 게임 기록
│       ├── db/nicknames/     # 닉네임
│       └── analyze/          # AI 캡쳐 분석
├── components/
│   ├── Navigation.tsx        # 헤더 + 테마 선택 + 유저 메뉴
│   └── GuideBanner.tsx       # 페이지별 첫 방문 안내 배너
├── lib/
│   ├── kvGroups.ts           # KV CRUD 전체 (유저·그룹·멤버·초대)
│   └── stats.ts              # 통계 계산 (랭킹·챔피언·업적)
├── auth.ts                   # NextAuth v5 설정 (Google OAuth + JWT 콜백)
├── proxy.ts                  # 라우트 보호 (Next.js 16 방식)
└── types/
    └── next-auth.d.ts        # 세션 타입 확장 (id·groupId·role 추가)
```

---

## 11. 배포 환경

| 항목 | 내용 |
|------|------|
| 호스팅 | Vercel (main 브랜치 push 시 자동 배포) |
| 데이터베이스 | Upstash Redis (서버리스 Redis) |
| 인증 | Google Cloud Console OAuth 2.0 |
| 환경변수 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` |

---

## 12. LLM 활용 개발 방식

전체 개발 과정에서 **Claude Code (Anthropic CLI)** 를 페어 프로그래밍 파트너로 활용했습니다.

| 역할 | 담당 |
|------|------|
| 요구사항·UX 결정 | 인간 — 친구들 실제 사용 피드백 기반 |
| 설계 결정 | 인간 — 데이터 구조, 기능 범위 최종 결정 |
| 코드 구현 | Claude — 컴포넌트 작성, API 설계, 타입 정의 |
| 버그 파악 | 협업 — 인간이 증상 설명, Claude가 원인 분석·수정 |
| 기획 아이디어 | 협업 — Claude가 제안, 인간이 채택 여부 결정 |
