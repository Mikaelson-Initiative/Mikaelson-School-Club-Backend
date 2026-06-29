// sentry.edge.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sentry initialisation for Next.js Edge runtime (middleware.ts).
// The Edge runtime has a reduced API — no Node.js built-ins.
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Keep edge trace sample rate low — middleware runs on every request
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.02 : 1.0,

  debug: false,

  environment: process.env.NODE_ENV ?? "development",

  enabled: !!process.env.SENTRY_DSN,
});