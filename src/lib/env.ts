// src/lib/env.ts
// ─────────────────────────────────────────────────────────────────────────────
// Validated environment variables.
// Import `env` instead of `process.env` throughout the codebase.
// If any required variable is absent at startup, this throws immediately
// with a clear error message rather than crashing mid-request.
//
// Usage:
//   import { env } from "@/lib/env";
//   const client = new Resend(env.RESEND_API_KEY);
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

const schema = z.object({
  // ── Database ───────────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection string"),
  DIRECT_DATABASE_URL: z
    .string()
    .url("DIRECT_DATABASE_URL must be a valid PostgreSQL connection string"),

  // ── Auth.js ────────────────────────────────────────────────────────────────
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // ── Firebase Admin SDK ────────────────────────────────────────────────────
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z
    .string()
    .email("FIREBASE_CLIENT_EMAIL must be a valid email"),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1, "FIREBASE_PRIVATE_KEY is required")
    .refine(
      (k) => k.includes("BEGIN PRIVATE KEY"),
      "FIREBASE_PRIVATE_KEY does not look like a valid PEM key"
    ),

  // ── Upstash Redis ─────────────────────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1, "UPSTASH_REDIS_REST_TOKEN is required"),

  // ── Resend ────────────────────────────────────────────────────────────────
  RESEND_API_KEY: z
    .string()
    .startsWith("re_", "RESEND_API_KEY must start with 're_'"),

  // ── Cron ──────────────────────────────────────────────────────────────────
  CRON_SECRET: z
    .string()
    .min(32, "CRON_SECRET must be at least 32 characters"),

  // ── Vercel Blob (optional — only required if upload endpoint is enabled) ───
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // ── Sentry (optional — set when Sentry is configured) ─────────────────────
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // ── Runtime environment ───────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ── CORS — allowed origins (comma-separated list) ─────────────────────────
  // e.g. "https://mikaelsoninitiative.org,https://www.mikaelsoninitiative.org"
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // ── Seed admin password ───────────────────────────────────────────────────
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

// Parse and validate at module load time
const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues
    .map((e) => `  • ${e.path.join(".")}: ${e.message}`)
    .join("\n");

  // prettier-ignore
  console.error(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "❌  Missing or invalid environment variables:\n\n" +
    missing + "\n\n" +
    "Copy .env.example to .env.local and fill in all values.\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  );

  // Throw in production so deployment fails fast; warn in dev for flexibility
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables. Deployment aborted.");
  }
}

export const env = parsed.success
  ? parsed.data
  : (process.env as unknown as z.infer<typeof schema>);