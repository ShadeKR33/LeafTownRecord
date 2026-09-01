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
    async jwt({ token, user }) {
      if (user) {
        // 최초 로그인 — token.sub는 Google OAuth sub ID (항상 존재)
        const userId = token.sub!;
        const userData = await getOrCreateUser({
          id: userId,
          email: user.email ?? "",
          name: user.name,
          image: user.image,
        });
        token.uid = userData.id;
        token.groupId = userData.groupId;
        token.role = userData.role;
      } else if (token.uid) {
        // 매 요청마다 최신 groupId/role을 DB에서 다시 확인.
        // JWT는 한 번 발급되면 만료 전까지 갱신되지 않으므로, 그룹 생성/참여/탈퇴 등으로
        // DB의 groupId가 바뀌어도 세션이 옛 값에 영구히 고정되는 것을 방지한다.
        const userData = await getUser(token.uid as string);
        if (userData) {
          token.groupId = userData.groupId;
          token.role = userData.role;
        }
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
