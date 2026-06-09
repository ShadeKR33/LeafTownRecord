# 🔧 Troubleshooting — Leaf Town Records 개발 과정 기록

개발 중 마주친 주요 버그와 해결 과정을 기록한 문서입니다.

---

## 1. 랭킹 순위 계산 버그 — 동점자 처리 오류

**문제**
7점 동점자가 3명일 때, 6점인 사람이 🥉 3위 대신 "5위"로 표시됨.

**원인**
순위를 배열 인덱스 + 1 (`i + 1`)로 계산하고 있었음. 동점자가 끼어있으면 그만큼 순위가 건너뜀.
```js
// 버그: 인덱스 기반
ranks.push(i + 1);  // 동점자 3명이 있으면 다음은 5위
```

**해결**
밀집 순위(Dense Ranking) 방식으로 변경. 이전 순위에서 +1만 증가.
```js
// 수정: 밀집 순위 (1, 2, 2, 2, 3, ...)
if (i === 0) ranks.push(1);
else if (persons[i - 1].score === persons[i].score) ranks.push(ranks[i - 1]);
else ranks.push(ranks[i - 1] + 1);
```

---

## 2. 포지션(주/부) 미표시 — 닉네임 정확 일치 오류

**문제**
특정 친구 한 명만 상세 페이지에서 주·부 포지션이 표시되지 않음.

**원인**
닉네임 DB 조회 시 `===` 정확 일치로만 비교. URL의 닉네임과 DB 저장값 사이에 대소문자 또는 공백 차이가 있으면 `null` 반환되어 포지션 데이터 전체가 누락됨.
```js
// 버그: 대소문자/공백 차이 무시 못함
nicknames.find(n => n.nickname === nickname)
```

**해결**
`normalizeId` 비교 + altNicknames 배열까지 검색하도록 확장.
```js
// 수정
nicknames.find(n =>
  normalizeId(n.nickname) === normalizeId(nickname) ||
  (n.altNicknames || []).some(alt => normalizeId(alt) === normalizeId(nickname))
)
```

---

## 3. 주·부계정 플레이어 업적 미표시

**문제**
부계정이 등록된 플레이어는 상세 페이지에 업적이 단 하나도 표시되지 않음.

**원인**
`computeAggregatedStats` 함수 반환값에 `badges: []`가 하드코딩. vsStats·withStats도 빈 객체로 반환되어 관계형 업적도 전부 누락.
```js
// 버그
return { ..., positionStats: {}, vsStats: {}, withStats: {}, badges: [] };
```

**해결**
모든 계정의 vsStats·withStats·positionStats를 합산하고, 합산된 데이터로 `computeBadges` 직접 호출.
```js
// 수정: 합산 후 업적 계산
const badges = computeBadges({ totalGames, winRate, ..., vsStats, withStats, ... });
return { ..., positionStats, vsStats, withStats, badges };
```

---

## 4. 닉네임 대소문자 차이로 다른 사람 취급

**문제**
시너지·상대전적 통계에서 `"Shade"`와 `"shade"`가 별개 인물로 집계되어 데이터가 분리됨.

**원인**
`vsStats`·`withStats`가 닉네임 문자열을 그대로 키로 사용. 시리즈마다 표기가 다르면 별개 항목으로 누적.

**해결 1 (임시)** — 동일한 `normalizeId` 값을 가진 기존 키를 찾아 합산.
```js
const key = Object.keys(vsStats).find(k => normalizeId(k) === normalizeId(e)) ?? e;
```

**해결 2 (근본)** — `computePlayerStats`에 닉네임 DB를 받아 모든 키를 실명으로 변환.
```js
const toDisplayName = (nick: string) => dnMap.get(normalizeId(nick)) ?? nick;
// vsStats 저장 시
const key = toDisplayName(e);  // 닉네임 → 실명으로 통합
```

덕분에 닉네임 변경 이력·주부계정·대소문자 차이가 모두 같은 사람으로 합산됨.

---

## 5. 업적 툴팁이 테이블 박스에 잘려 보이지 않음

**문제**
랭킹 페이지에서 업적 아이콘에 마우스를 올려도 툴팁이 테이블 컨테이너에 의해 잘려 내용이 표시되지 않음.

**원인**
테이블 wrapper에 적용된 `overflow-hidden`이 `position: absolute` + `z-index: 50` 요소까지 클리핑.

**해결**
wrapper에서 `overflow-hidden` 제거, 툴팁 `z-index: 9999` 적용 및 그림자 강화.
```jsx
// 수정 전
<div className="rounded-lg overflow-hidden border">

// 수정 후
<div className="rounded-lg border">  {/* overflow-hidden 제거 */}
// 툴팁
<div style={{ zIndex: 9999 }}>
```

---

## 6. AI 챔피언 인식 부정확

**문제**
캡처 분석에서 AI가 챔피언 초상화 아이콘을 자주 오인식해 엉뚱한 이름을 반환.

**원인**
결산 화면의 챔피언 아이콘은 50~60px 원형 썸네일. 160개 이상 챔피언 중 하나를 이미지만으로 판별하는 데 근본적 한계가 있음. 스킨 착용 시 원본과 외형이 완전히 달라 오인식 빈도 증가.

**해결**
- AI 분석 후 챔피언 필드를 **빈칸으로 초기화**, 사용자가 직접 입력하는 방식으로 전환
- 브라우저 기본 `<datalist>` 자동완성 → 커스텀 드롭다운(방향키·Enter·Esc 키보드 지원)으로 교체
- Riot Data Dragon API에서 최신 챔피언 목록을 동적으로 받아 자동완성 소스로 사용

---

## 7. `신화` 등급 추가 후 빌드 실패 — 타입 섀도잉

**문제**
`types.ts`의 `BadgeGrade` 타입에 `"신화"`를 추가했지만 빌드가 실패.
```
Type error: Object literal may only specify known properties,
and '신화' does not exist in type 'Record<BadgeGrade, ...>'
```

**원인**
`[nickname]/page.tsx` 컴포넌트 내부에 같은 이름의 로컬 타입이 선언되어 있어, 임포트한 타입을 가리고(shadowing) 있었음.
```ts
// 버그: 컴포넌트 내부 로컬 타입이 임포트 타입을 가림
type BadgeGrade = "일반" | "희귀" | "영웅" | "전설";  // "신화" 없음
```

**해결**
로컬 타입에 `"신화"` 추가.
```ts
type BadgeGrade = "일반" | "희귀" | "영웅" | "전설" | "신화";
```

---

## 8. sed 명령 오용으로 전체 등급 일괄 변경

**문제**
챔피언 탐험가 업적 1개만 `희귀 → 일반`으로 바꾸려다 파일 내 모든 `grade: "희귀"` 항목이 `일반`으로 일괄 변경됨.

**원인**
패턴이 너무 광범위했음.
```bash
# 버그: stats.ts 전체에서 매칭
sed -i '' 's/grade: "희귀" });/grade: "일반" });/g' stats.ts
```

**해결**
전체 복원 후 id 조건을 포함한 정교한 패턴으로 수정.
```bash
# 1. 전체 복원
sed -i '' 's/grade: "일반" });/grade: "희귀" });/g' stats.ts

# 2. 개별 타겟 수정
sed -i '' '/id: "first"/s/grade: "희귀"/grade: "일반"/' stats.ts
sed -i '' '/id: "explorer"/s/grade: "희귀"/grade: "일반"/' stats.ts
```

**교훈**
`sed`로 코드 수정 시 id나 고유한 주변 문자열을 함께 패턴에 포함해 범위를 좁혀야 함.
