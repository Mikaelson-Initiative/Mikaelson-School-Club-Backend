// src/types/next-auth.d.ts
// ─────────────────────────────────────────────────────────────────────────────
// Augments Auth.js (NextAuth) default types so that session.user.id
// and session.user.role are typed throughout the codebase.
// ─────────────────────────────────────────────────────────────────────────────

import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "SUPERADMIN" | "STUDENT" | "MENTOR" | "CHAMPION";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "ADMIN" | "SUPERADMIN" | "STUDENT" | "MENTOR" | "CHAMPION";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "ADMIN" | "SUPERADMIN" | "STUDENT" | "MENTOR" | "CHAMPION";
  }
}