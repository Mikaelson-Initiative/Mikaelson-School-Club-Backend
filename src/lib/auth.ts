// src/lib/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Auth.js v5 configuration — credentials + Firebase providers.
// Type augmentation lives in src/types/next-auth.d.ts; no duplicate declare here.
// ─────────────────────────────────────────────────────────────────────────────

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { env } from "./env";

export async function credentialsAuthorize(credentials: Record<string, any> | undefined) {
  throw new Error("Manual credentials authentication has been disabled.");
  return null;
}

export async function firebaseAuthorize(credentials: Record<string, any> | undefined) {
  throw new Error("Firebase authentication has been disabled.");
  return null;
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },

  providers: [
    // ── Provider 1: email + password ──────────────────────────────────────
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      authorize: credentialsAuthorize,
    }),

    // ── Provider 2: Firebase ID token ─────────────────────────────────────
    CredentialsProvider({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      authorize: firebaseAuthorize,
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id as string;
        token.role = (user as { role: string }).role as any;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id   as string;
        session.user.role = token.role as any;
      }
      return session;
    },
  },

  secret: env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);