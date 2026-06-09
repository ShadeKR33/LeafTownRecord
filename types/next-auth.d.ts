import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      groupId?: string;
      role?: "admin" | "editor" | "viewer";
    } & DefaultSession["user"];
  }
  interface User {
    groupId?: string;
    role?: "admin" | "editor" | "viewer";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    groupId?: string;
    role?: "admin" | "editor" | "viewer";
  }
}
