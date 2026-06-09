"use client";

import Link from "next/link";

interface SectionProps {
  id: string;
  icon: string;
  title: string;
  badge?: string;
  children: React.ReactNode;
}

function Section({ id, icon, title, badge, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{icon}</span>
        <h2 className="text-xl font-black" style={{ color: "var(--accent)" }}>{title}</h2>
        {badge && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "var(--accent)", color: "#fff", opacity: 0.85 }}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full text-xs font-black flex items-center justify-center mt-0.5"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {i + 1}
          </span>
          <span className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Tips({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-black mb-2" style={{ color: "var(--accent)" }}>💡 알아두면 좋은 것</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs flex items-start gap-2" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: "var(--accent)", marginTop: 1 }}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-black mb-3" style={{ color: "var(--text)" }}>{children}</p>
  );
}

export default function GuidePage() {
  const sections = [
    { id: "start",    icon: "🚀", label: "빠른 시작"   },
    { id: "manage",   icon: "🏕️", label: "마을 관리"   },
    { id: "analysis", icon: "📸", label: "캡쳐 분석"   },
    { id: "ranking",  icon: "🏆", label: "랭킹"        },
    { id: "champion", icon: "⚔️", label: "챔피언 분석" },
    { id: "calendar", icon: "📅", label: "달력"        },
    { id: "team",     icon: "🎲", label: "팀 편성"     },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="text-5xl mb-4">📖</div>
        <h1 className="text-3xl font-black mb-2" style={{ color: "var(--accent)" }}>사용 가이드</h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          내전 기록소의 모든 기능을 자세히 설명합니다
        </p>
      </div>

      {/* 목차 */}
      <nav className="rounded-2xl p-5 mb-14" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-black mb-3" style={{ color: "var(--text-muted)" }}>목차</p>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sections.map(s => (
            <li key={s.id}>
              <a href={`#${s.id}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.03]"
                style={{ background: "var(--hover)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── 빠른 시작 ── */}
      <Section id="start" icon="🚀" title="처음이라면 여기서 시작하세요" badge="필독">
        <Card>
          <Label>내전 기록소를 처음 쓴다면 이 순서대로 따라하세요</Label>
          <Steps items={[
            "마을 관리 → 멤버 관리 탭에서 내전 참여 멤버들의 닉네임과 티어·포지션을 등록합니다.",
            "내전을 하고 나서 결과 화면(탭 창)을 캡쳐해 캡쳐 분석 페이지에 업로드하면 자동으로 기록됩니다.",
            "기록이 쌓이면 랭킹·챔피언 분석에 통계가 자동으로 반영됩니다. 끝!",
          ]} />
        </Card>
        <Tips items={[
          "멤버 닉네임을 먼저 등록해야 캡쳐 분석 시 이름이 올바르게 인식됩니다.",
          "그룹 초대 링크를 친구들에게 공유하면 같은 기록을 함께 보고 관리할 수 있어요.",
        ]} />
      </Section>

      {/* ── 마을 관리 ── */}
      <Section id="manage" icon="🏕️" title="마을 관리">
        <Card>
          <Label>👥 멤버 관리 탭</Label>
          <Steps items={[
            "'+멤버 추가' 버튼을 눌러 닉네임, 실명(선택), 주 포지션, 티어를 입력합니다.",
            "대체 닉네임(구 닉네임, 부계정 등)을 추가하면 캡쳐 분석 시 같은 사람으로 인식합니다.",
            "이미 등록된 멤버는 카드를 클릭해 정보를 수정하거나 삭제할 수 있습니다.",
          ]} />
        </Card>
        <Card>
          <Label>🏕️ 그룹 관리 탭</Label>
          <Steps items={[
            "초대 링크를 복사해 카카오톡이나 디스코드로 공유하면 친구가 링크 클릭 한 번으로 그룹에 참여합니다.",
            "참여한 멤버에게 편집자 또는 뷰어 권한을 부여할 수 있어요.",
            "초대 링크를 재생성하면 기존 링크는 무효가 됩니다.",
          ]} />
        </Card>
        <Tips items={[
          "관리자만 멤버 역할을 변경하거나 내보낼 수 있습니다.",
          "뷰어 권한은 기록 조회만 가능하고, 편집자는 기록 추가·수정도 가능해요.",
          "닉네임은 최대 2개까지 대체 닉네임을 등록할 수 있습니다.",
        ]} />
      </Section>

      {/* ── 캡쳐 분석 ── */}
      <Section id="analysis" icon="📸" title="캡쳐 분석" badge="핵심 기능">
        <Card>
          <Label>게임 기록을 자동으로 등록하는 방법</Label>
          <Steps items={[
            "내전이 끝난 후 게임 결과 화면(탭 완료 화면)을 캡쳐합니다.",
            "캡쳐 분석 페이지에서 이미지를 업로드하면 AI가 닉네임·챔피언·승패를 자동으로 인식합니다.",
            "3판 2선이라면 2~3장, 5판 3선이라면 3~5장을 한 번에 올릴 수 있습니다.",
            "인식 결과를 검수 화면에서 확인하고 틀린 부분을 수정한 뒤 저장합니다.",
          ]} />
        </Card>
        <Card>
          <Label>검수 화면에서 할 수 있는 것</Label>
          <Steps items={[
            "닉네임이 잘못 인식된 경우 드롭다운에서 올바른 멤버를 선택하세요.",
            "챔피언 이름이 틀렸으면 직접 수정할 수 있습니다.",
            "승패가 반전된 경우 승리 팀 버튼을 눌러 바꿀 수 있습니다.",
            "모든 게임 검수 후 '전체 저장' 버튼을 누르면 한 번에 기록됩니다.",
          ]} />
        </Card>
        <Tips items={[
          "캡쳐 화면이 선명할수록 인식률이 높습니다. 너무 어둡거나 잘린 화면은 인식 오류가 날 수 있어요.",
          "저장된 기록은 랭킹·챔피언 분석·달력에 즉시 반영됩니다.",
          "기록은 달력 페이지에서도 직접 수정·삭제할 수 있습니다.",
        ]} />
      </Section>

      {/* ── 랭킹 ── */}
      <Section id="ranking" icon="🏆" title="랭킹">
        <Card>
          <Label>랭킹 보는 방법</Label>
          <Steps items={[
            "상단 탭(KDA / 승률 / MVP / 어시스트 등)을 눌러 원하는 지표로 순위를 바꿔볼 수 있습니다.",
            "플레이어 카드를 클릭하면 세부 통계와 획득한 업적(뱃지)을 확인할 수 있어요.",
            "뉴스 티커(상단 스크롤 텍스트)에 최근 기록 기반 하이라이트가 자동으로 표시됩니다.",
          ]} />
        </Card>
        <Card>
          <Label>뱃지(업적) 시스템</Label>
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
            특정 조건을 달성하면 자동으로 뱃지가 부여됩니다. 플레이어 카드를 클릭해 보유 뱃지를 확인하세요.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon:"🌱", name:"첫 걸음",    desc:"첫 경기 참여"           },
              { icon:"🌊", name:"흐름을 타다", desc:"최고 연승 3회 이상"     },
              { icon:"🔥", name:"불꽃전사",    desc:"최고 연승 5회 이상"     },
              { icon:"⭐", name:"신예 에이스", desc:"10경기+ 승률 60%+"     },
              { icon:"📊", name:"착실하게",    desc:"10경기 이상 참여"       },
              { icon:"👑", name:"MVP 헌터",    desc:"MVP 3회 이상"          },
            ].map(b => (
              <div key={b.name} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "var(--hover)" }}>
                <span className="text-lg">{b.icon}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{b.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Tips items={[
          "기록이 없으면 랭킹이 표시되지 않아요. 먼저 캡쳐 분석으로 기록을 등록하세요.",
          "같은 닉네임이 여러 번 등록되어 있으면 대체 닉네임으로 묶어야 정확한 통계가 나옵니다.",
        ]} />
      </Section>

      {/* ── 챔피언 분석 ── */}
      <Section id="champion" icon="⚔️" title="챔피언 분석">
        <Card>
          <Label>챔피언 분석 보는 방법</Label>
          <Steps items={[
            "상단 포지션 탭(탑·정글·미드·원딜·서포터)을 선택해 해당 포지션의 챔피언 티어를 확인합니다.",
            "플레이어 필터를 사용하면 특정 멤버의 챔피언 풀만 볼 수 있어요.",
            "챔피언 카드에는 픽 횟수·승률·KDA 등 포지션 내 상대 순위 기반 티어가 표시됩니다.",
          ]} />
        </Card>
        <Card>
          <Label>티어 기준</Label>
          <div className="flex flex-col gap-2">
            {[
              { tier:"1티어", color:"#ef4444", desc:"포지션 내 압도적으로 높은 승률·성과" },
              { tier:"2티어", color:"#f97316", desc:"평균 이상의 안정적인 성과"           },
              { tier:"3티어", color:"#eab308", desc:"준수한 성과, 평균 수준"              },
              { tier:"4티어", color:"#6b7280", desc:"평균 이하, 추가 연습 필요"           },
              { tier:"5티어", color:"#9ca3af", desc:"낮은 승률, 개선이 필요한 챔피언"    },
            ].map(t => (
              <div key={t.tier} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: "var(--hover)" }}>
                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: t.color + "22", color: t.color, minWidth: 44, textAlign: "center" }}>
                  {t.tier}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t.desc}</span>
              </div>
            ))}
          </div>
        </Card>
        <Tips items={[
          "1픽 이상인 챔피언만 집계됩니다. 기록이 많을수록 티어 정확도가 높아져요.",
          "티어는 포지션 내 다른 멤버들과의 상대 비교로 자동 배정됩니다.",
        ]} />
      </Section>

      {/* ── 달력 ── */}
      <Section id="calendar" icon="📅" title="달력">
        <Card>
          <Label>달력 사용 방법</Label>
          <Steps items={[
            "내전이 있었던 날짜에는 점(●)이 표시됩니다. 날짜를 클릭하면 해당 날의 게임 목록이 나와요.",
            "우측 상단 '+ 기록 추가' 버튼으로 날짜·게임 결과를 직접 입력할 수 있습니다.",
            "게임 목록에서 항목을 클릭하면 세부 내용을 수정하거나 삭제할 수 있어요.",
            "캡쳐 분석으로 등록한 기록도 달력에 자동으로 반영됩니다.",
          ]} />
        </Card>
        <Tips items={[
          "직접 입력 시 날짜를 클릭하면 해당 날짜가 자동으로 선택됩니다.",
          "달력은 그룹 전체의 기록을 기준으로 표시됩니다.",
        ]} />
      </Section>

      {/* ── 팀 편성 ── */}
      <Section id="team" icon="🎲" title="팀 편성">
        <Card>
          <Label>팀 편성 순서</Label>
          <Steps items={[
            "참여할 멤버 이름을 눌러 선택합니다. (짝수 인원 권장)",
            "'팀 나누기' 버튼을 누르면 자동으로 두 팀으로 구성됩니다.",
            "마음에 안 들면 다시 누르면 새로 섞어요.",
            "팀이 확정되면 미니게임으로 블루/레드 사이드를 결정합니다.",
          ]} />
        </Card>
        <Card>
          <Label>사이드 결정 미니게임 3가지</Label>
          <div className="flex flex-col gap-2">
            {[
              { icon:"🎯", name:"표창 과녁",   desc:"클릭 타이밍으로 과녁 중앙에 맞히는 팀이 사이드 선택권 획득" },
              { icon:"🪙", name:"동전 던지기",  desc:"앞면/뒷면 선택 후 동전을 던져 결정"                      },
              { icon:"📜", name:"두루마리 뽑기", desc:"두 팀 중 하나가 랜덤으로 사이드를 배정받음"               },
            ].map(g => (
              <div key={g.name} className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "var(--hover)" }}>
                <span className="text-xl">{g.icon}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{g.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Label>결과 공유</Label>
          <Steps items={[
            "팀·사이드 결정 후 '복사' 버튼을 누르면 팀 구성이 텍스트로 클립보드에 복사됩니다.",
            "포지션을 함께 입력하면 공유 텍스트에 포지션까지 포함돼요.",
            "카카오톡·디스코드에 바로 붙여넣기 하세요.",
          ]} />
        </Card>
        <Tips items={[
          "홀수 인원도 가능하지만 한 팀이 1명 더 많아질 수 있어요.",
          "팀 편성 결과는 저장되지 않습니다. 기록이 필요하면 달력·캡쳐 분석을 이용하세요.",
        ]} />
      </Section>

      {/* 저작권 안내 */}
      <div className="rounded-2xl p-5 mb-10" style={{ background: "var(--hover)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-black mb-2" style={{ color: "var(--text-muted)" }}>⚠️ 저작권 관련 안내</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
          이 사이트는 애니메이션 <strong style={{ color: "var(--text-muted)" }}>나루토(NARUTO)</strong>의 세계관과 설정
          (나뭇잎 마을, 비 마을, 아카츠키, 달의 눈 계획, 페인의 시험 등)에서 아이디어를 차용하여 제작되었습니다.
          나루토의 모든 저작권은 <strong style={{ color: "var(--text-muted)" }}>기시모토 마사시 / 집영사 / TV도쿄 / 피에로</strong>에 있습니다.
        </p>
        <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-dim)" }}>
          현재 이 사이트는 비영리 개인 프로젝트로 운영되고 있습니다.
          향후 수익화가 발생할 경우 관련 저작권자의 허가를 받거나, 원작 요소를 대체하는 방향으로 수정할 예정입니다.
        </p>
      </div>

      {/* 하단 링크 */}
      <div className="text-center pt-8 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>궁금한 점이 해결됐나요?</p>
        <Link href="/ranking"
          className="inline-block px-8 py-3 rounded-xl font-black text-white transition-all hover:scale-[1.02]"
          style={{ background: "var(--accent)" }}>
          기록소로 돌아가기
        </Link>
      </div>

    </div>
  );
}
