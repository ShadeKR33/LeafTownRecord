"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [groupName, setGroupName] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // 토큰으로 그룹 이름 조회
  useEffect(() => {
    fetch(`/api/group/invite?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.group) setGroupName(d.group.name);
        else setError("유효하지 않은 초대 링크입니다.");
      })
      .catch(() => setError("링크 확인 중 오류가 발생했습니다."));
  }, [token]);

  // 로그인 완료 후 자동으로 그룹 참여
  useEffect(() => {
    if (status !== "authenticated" || !groupName || done) return;
    if (session?.user?.groupId) {
      // 이미 그룹 있으면 바로 이동
      router.replace("/ranking");
      return;
    }
    joinGroup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, groupName]);

  async function joinGroup() {
    setJoining(true);
    const res = await fetch("/api/group/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "참여 중 오류가 발생했습니다.");
      setJoining(false);
      return;
    }
    await update(); // JWT 갱신
    setDone(true);
    setTimeout(() => router.replace("/ranking"), 1200);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="text-4xl mb-4">😵</div>
        <p className="font-bold mb-2" style={{ color: "var(--text)" }}>{error}</p>
        <a href="/" className="text-sm underline" style={{ color: "var(--accent)" }}>홈으로</a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <p className="font-bold text-lg mb-1" style={{ color: "var(--accent)" }}>그룹에 참여했습니다!</p>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>잠시 후 이동합니다...</p>
      </div>
    );
  }

  if (!groupName) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{ color: "var(--text-dim)" }}>링크 확인 중...</div>
      </div>
    );
  }

  // 로그인 안 된 상태
  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="text-5xl mb-4">🍃</div>
        <h2 className="text-2xl font-black mb-2" style={{ color: "var(--accent)" }}>
          {groupName}
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--text-dim)" }}>
          그룹에 초대되었습니다. Google로 로그인해서 참여하세요.
        </p>
        <button
          onClick={() =>
            signIn("google", {
              callbackUrl: `/invite/${token}`,
            })
          }
          className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "#fff",
            color: "#3c4043",
            border: "1px solid #dadce0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          }}>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Google로 로그인 후 참여하기
        </button>
      </div>
    );
  }

  // 로그인 중 or 참여 중
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="text-4xl mb-4">⏳</div>
      <p style={{ color: "var(--text-dim)" }}>{joining ? "그룹에 참여 중..." : "잠시만 기다려주세요..."}</p>
    </div>
  );
}
