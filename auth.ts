import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getOrCreateUser, getUser } from "@/lib/kvGroups";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // 최초 로그인 — token.sub는 Google OAuth sub ID (항상 존재)
        const userId = token.sub!;
        const userData = await getOrCreateUser({
          id: userId,
          email: user.email ?? "",
          name: user.name,
          image: user.image,
        });
        token.uid = userId;
        token.groupId = userData.groupId;
        token.role = userData.role;
      } else if (trigger === "update" && token.uid) {
        // 그룹 생성/참여 후 세션 갱신 요청
        const userData = await getUser(token.uid as string);
        token.groupId = userData?.groupId;
        token.role = userData?.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.groupId = token.groupId as string | undefined;
      session.user.role = token.role as "admin" | "editor" | "viewer" | undefined;
      return session;
    },
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const pathname = nextUrl.pathname;

      // API 라우트는 각 핸들러가 직접 auth 확인 (401 반환)
      if (pathname.startsWith("/api/")) return true;

      // 인증 불필요 페이지
      if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/invite/")) return true;

      if (!isLoggedIn) return false;
      return true;
    },
  },
  pages: { signIn: "/login" },
});
