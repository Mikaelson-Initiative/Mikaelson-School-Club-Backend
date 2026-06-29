// src/__tests__/integration/setup.ts
// ─────────────────────────────────────────────────────────────────────────────
// Setup for integration tests. Unlike src/__tests__/setup.ts (unit tests),
// this does NOT mock Prisma or repositories — it connects to the real
// ephemeral test Postgres started by docker/docker-compose.test.yml.
//
// Migrations must already be applied before tests run — see the
// test:integration script in package.json, which runs:
//   1. docker compose up (start Postgres)
//   2. prisma migrate deploy (apply schema)
//   3. vitest run --config vitest.integration.config.ts
//   4. docker compose down (teardown)
// ─────────────────────────────────────────────────────────────────────────────

import "./set-env";

import { beforeAll, afterAll, beforeEach } from "vitest";

// Mock only the genuinely external services — never the database
import { vi } from "vitest";

vi.mock("@/lib/mailer", () => ({
  sendApplicationConfirmation: vi.fn().mockResolvedValue(undefined),
  sendApplicationAlert:        vi.fn().mockResolvedValue(undefined),
  sendContactAlert:            vi.fn().mockResolvedValue(undefined),
  sendContactAutoReply:        vi.fn().mockResolvedValue(undefined),
  sendStatusUpdateEmail:       vi.fn().mockResolvedValue(undefined),
  sendEmailVerificationEmail:  vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/sentry", () => ({
  captureError:    vi.fn(),
  setSentryUser:   vi.fn(),
  clearSentryUser: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => ({
  verifyFirebaseToken: vi.fn().mockResolvedValue({
    uid: "firebase-uid-deleted",
    email: "deleted-fb@test.com",
    name: "FB Deleted",
  }),
}));

// Import AFTER env vars are set
import { prisma } from "@/lib/prisma";

const TRUNCATE_ORDER = [
  "AuditLog",
  "AuditLogArchive",
  "PasswordResetToken",
  "VerificationToken",
  "Application",
  "ContactMessage",
  "Event",
  "BlogPost",
  "TeamMember",
  "SchoolChapter",
  "User",
  "RateLimitBreach",
];

beforeAll(async () => {
  // Sanity check — fail fast with a clear message if Postgres isn't reachable
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error(
      "\n❌ Could not connect to the integration test database.\n" +
      "   Did you run `docker compose -f docker/docker-compose.test.yml up -d`\n" +
      "   and `npx prisma migrate deploy`? See README.md → Testing → Integration tests.\n"
    );
    throw err;
  }
});

beforeEach(async () => {
  // TRUNCATE ... CASCADE resets identity sequences and clears all FK-linked rows
  for (const table of TRUNCATE_ORDER) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});