"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* 카드 */}
        <div className="rounded-2xl p-8 text-center"
          style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
          <div className="text-5xl mb-4">🍃</div>
          <h2 className="text-2xl font-black mb-1" style={{ color: "var(--accent)" }}>
            나뭇잎 마을
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-dim)" }}>
            내전 기록소에 로그인하세요
          </p>

          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "#fff",
              color: "#3c4043",
              border: "1px solid #dadce0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            }}>
            {/* Google 로고 SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Google로 로그인
          </button>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "var(--text-dim)" }}>
          초대 링크를 통해 접속하면 자동으로 그룹에 참여됩니다
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
