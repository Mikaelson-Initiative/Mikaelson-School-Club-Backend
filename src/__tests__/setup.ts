// src/__tests__/setup.ts
// ─────────────────────────────────────────────────────────────────────────────
// Global test setup — runs before every test file.
// Stubs out environment variables so env.ts validation passes in tests.
// ─────────────────────────────────────────────────────────────────────────────

import { vi } from "vitest";

// Stub all required env vars before any module is imported
process.env.DATABASE_URL           = "postgresql://test:test@localhost:5432/test_db";
process.env.DIRECT_DATABASE_URL    = "postgresql://test:test@localhost:5432/test_db";
process.env.NEXTAUTH_SECRET        = "test-secret-that-is-at-least-32-characters-long!!";
process.env.NEXTAUTH_URL           = "http://localhost:3000";

process.env.UPSTASH_REDIS_REST_URL   = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
process.env.RESEND_API_KEY         = "re_test_key";
process.env.CRON_SECRET            = "test-cron-secret-that-is-at-least-32-chars!!";
process.env.ALLOWED_ORIGINS        = "http://localhost:3000";
// @ts-expect-error - NODE_ENV is typed as read-only in some environments
process.env.NODE_ENV = "test";

// Mock Prisma client so tests don't need a real database
vi.mock("@/lib/prisma", () => {
  const { Prisma } = require("@prisma/client");
  return {
    Prisma,
    prisma: {
      application: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      contactMessage: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      schoolChapter: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
        updateMany: vi.fn(),
      },
      blogPost: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      event: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
      teamMember: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      verificationToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      volunteerApplication: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      rateLimitBreach: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      habit: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      habitLog: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      accountabilityGroup: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      accountabilityMember: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      meetingAttendance: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
      },
      lesson: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      project: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      projectMember: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
      $queryRawUnsafe: vi.fn(),
      $executeRawUnsafe: vi.fn(),
      $transaction: vi.fn((val) => Promise.all(val)),
      volunteerApplication: {
        count: vi.fn().mockResolvedValue(10),
      },
    },
  };
});

vi.mock("@/lib/mailer", () => ({
  sendApplicationConfirmation: vi.fn().mockResolvedValue(undefined),
  sendApplicationAlert:        vi.fn().mockResolvedValue(undefined),
  sendContactAlert:            vi.fn().mockResolvedValue(undefined),
  sendContactAutoReply:        vi.fn().mockResolvedValue(undefined),
  sendStatusUpdateEmail:       vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail:      vi.fn().mockResolvedValue(undefined),
  sendEmailVerificationEmail:  vi.fn().mockResolvedValue(undefined),
}));

// Mock Sentry so no real errors are sent during tests
vi.mock("@/lib/sentry", () => ({
  captureError:    vi.fn(),
  setSentryUser:   vi.fn(),
  clearSentryUser: vi.fn(),
}));

// Mock audit so tests don't need DB
vi.mock("@/lib/audit", () => ({
  writeAuditLog:  vi.fn().mockResolvedValue(undefined),
  getRequestMeta: vi.fn().mockReturnValue({ ip: "127.0.0.1", userAgent: "vitest" }),
}));

// Mock next/server and next-auth to avoid edge runtime errors in vitest
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body, init) => new Response(JSON.stringify(body), init)),
    redirect: vi.fn(),
    next: vi.fn(),
  },
}));
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));
