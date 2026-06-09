import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/kvGroups";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    const userData = await getUser(session.user.id);
    redirect(userData?.groupId ? "/ranking" : "/manage");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-6 pt-16 pb-12">
      {/* 로고 / 타이틀 */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🍃</div>
        <h1 className="text-4xl font-black tracking-wide mb-2" style={{ color: "var(--accent)" }}>
          나뭇잎 마을 내전 기록소
        </h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          (상급닌자 제1시험)
        </p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <div style={{ height: "1px", width: "60px", background: "linear-gradient(90deg, transparent, var(--border-green))" }} />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            친구들의 내전 기록을 함께 관리하세요
          </span>
          <div style={{ height: "1px", width: "60px", background: "linear-gradient(90deg, var(--border-green), transparent)" }} />
        </div>
      </div>

      {/* 기능 소개 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full mb-10">
        {[
          { icon: "🏆", title: "랭킹 시스템",  desc: "KDA, 승률, MVP 등 다양한 지표로 순위를 확인하세요" },
          { icon: "⚔️", title: "챔피언 분석",  desc: "자주 플레이한 챔피언과 포지션 통계를 한눈에" },
          { icon: "📅", title: "달력",          desc: "날짜별 내전 기록을 달력으로 한눈에 확인하세요" },
          { icon: "📸", title: "캡쳐 분석",     desc: "내전 결과 캡쳐를 업로드하면 자동으로 기록돼요" },
        ].map((f) => (
          <div key={f.title} className="rounded-xl p-4 text-center"
            style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <div className="text-3xl mb-2">{f.icon}</div>
            <div className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>{f.title}</div>
            <div className="text-xs" style={{ color: "var(--text-dim)" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* 로그인 버튼 */}
      <Link href="/login"
        className="px-10 py-4 rounded-2xl text-lg font-black tracking-wide transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: "var(--accent)",
          color: "#fff",
          boxShadow: "0 4px 20px rgba(76,175,80,0.4)",
        }}>
        Google로 시작하기
      </Link>
      <p className="mt-4 text-xs" style={{ color: "var(--text-dim)" }}>
        초대 링크를 받았다면 링크를 직접 클릭해주세요
      </p>
    </div>
  );
}
