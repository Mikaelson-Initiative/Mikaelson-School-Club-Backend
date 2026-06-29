// sentry.server.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sentry initialisation for the Next.js Node.js runtime (API routes, SSR).
// This file is auto-loaded by @sentry/nextjs — do not import it manually.
//
// Setup: npx @sentry/wizard@latest -i nextjs
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Capture 10% of transactions in production for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Full stack traces in development
  debug: process.env.NODE_ENV === "development",

  environment: process.env.NODE_ENV ?? "development",

  // Do not send events in test/development unless DSN is explicitly set
  enabled: !!process.env.SENTRY_DSN,

  // Ignore common non-actionable errors
  ignoreErrors: [
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
    /^ResizeObserver loop/,
  ],

  beforeSend(event) {
    // Scrub sensitive fields from request bodies before sending to Sentry
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      if (data.password)     data.password     = "[Filtered]";
      if (data.passwordHash) data.passwordHash  = "[Filtered]";
      if (data.newPassword)  data.newPassword   = "[Filtered]";
      if (data.idToken)      data.idToken       = "[Filtered]";
      if (data.token)        data.token         = "[Filtered]";
    }
    return event;
  },
});