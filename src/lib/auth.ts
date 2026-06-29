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
  if (!credentials?.email || !credentials?.password) {
    throw new Error("Email and password are required.");
  }

  const email = (credentials.email as string).trim().toLowerCase();
  console.log("[DEBUG AUTH] Attempting credentials login for email:", email);
  console.log("[DEBUG AUTH] Provided password length:", (credentials.password as string).length);

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  console.log("[DEBUG AUTH] User found in database:", !!user);
  if (user) {
    console.log("[DEBUG AUTH] User provider:", user.provider);
    console.log("[DEBUG AUTH] User passwordHash exists:", !!user.passwordHash);
  }

  if (!user || user.provider !== "CREDENTIALS" || !user.passwordHash) {
    throw new Error("Invalid email or password.");
  }

  if (user.isDeleted) {
    throw new Error("This account has been deleted.");
  }

  if (!user.emailVerified) {
    throw new Error("Please verify your email before logging in.");
  }

  if (user.accountStatus === "PENDING_APPROVAL") {
    throw new Error("Your account is pending approval by a mentor.");
  }

  if (user.accountStatus === "SUSPENDED") {
    throw new Error("This account has been suspended.");
  }

  const valid = await bcrypt.compare(
    credentials.password as string,
    user.passwordHash
  );
  console.log("[DEBUG AUTH] Bcrypt comparison match:", valid);
  if (!valid) throw new Error("Invalid email or password.");

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
  });

  await writeAuditLog({
    actorId:    user.id,
    actorEmail: user.email,
    action:     "LOGIN",
    model:      "User",
    recordId:   user.id,
    after:      { provider: "CREDENTIALS" },
  });

  return { id: user.id, email: user.email, name: user.name ?? undefined, image: user.avatarUrl ?? undefined, role: user.role };
}

export async function firebaseAuthorize(credentials: Record<string, any> | undefined) {
  if (!credentials?.idToken) throw new Error("Firebase ID token is required.");

  const decoded = await verifyFirebaseToken(credentials.idToken as string);
  if (!decoded) throw new Error("Invalid or expired Firebase token.");

  let user = await prisma.user.findUnique({
    where: { firebaseUid: decoded.uid },
  });

  if (user) {
    if (user.isDeleted) {
      throw new Error("This account has been deleted.");
    }
    if (user.accountStatus === "PENDING_APPROVAL") {
      throw new Error("Your account is pending approval by a mentor.");
    }
    if (user.accountStatus === "SUSPENDED") {
      throw new Error("This account has been suspended.");
    }
  }

  if (!user) {
    // Link Firebase UID to a pre-authorised email
    const byEmail = await prisma.user.findUnique({
      where: { email: decoded.email ?? "" },
    });

    if (!byEmail) {
      throw new Error(
        "This account is not authorised. Contact a SUPERADMIN to be added."
      );
    }

    if (byEmail.isDeleted) {
      throw new Error("This account has been deleted.");
    }

    if (byEmail.accountStatus === "PENDING_APPROVAL") {
      throw new Error("Your account is pending approval by a mentor.");
    }

    if (byEmail.accountStatus === "SUSPENDED") {
      throw new Error("This account has been suspended.");
    }

    user = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        firebaseUid:  decoded.uid,
        provider:     "FIREBASE",
        avatarUrl:    decoded.picture ?? byEmail.avatarUrl,
        lastLoginAt:  new Date(),
        loginCount:   { increment: 1 },
        emailVerified: byEmail.emailVerified ?? new Date(),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });
  }

  await writeAuditLog({
    actorId:    user.id,
    actorEmail: user.email,
    action:     "LOGIN",
    model:      "User",
    recordId:   user.id,
    after:      { provider: "FIREBASE", firebaseUid: decoded.uid },
  });

  return { id: user.id, email: user.email, name: user.name ?? decoded.name, image: user.avatarUrl ?? decoded.picture, role: user.role };
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