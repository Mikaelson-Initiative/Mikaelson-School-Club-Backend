// src/lib/sentry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sentry error capture wrapper.
// All API route catch blocks should call captureError() instead of
// console.error() so errors are tracked in Sentry with full context.
//
// Install: npm install @sentry/nextjs
// Then run: npx @sentry/wizard@latest -i nextjs
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/nextjs";

interface ErrorContext {
  route?: string;
  userId?: string;
  userEmail?: string;
  extra?: Record<string, unknown>;
}

/**
 * Captures an error in Sentry with optional context.
 * Falls back gracefully to console.error if Sentry is not configured.
 */
export function captureError(
  error: unknown,
  context?: ErrorContext
): void {
  // Always log to console regardless
  console.error(`[${context?.route ?? "unknown"}]`, error);

  Sentry.withScope((scope) => {
    if (context?.route) scope.setTag("route", context.route);
    if (context?.userId) scope.setUser({ id: context.userId, email: context.userEmail });
    if (context?.extra) scope.setExtras(context.extra);

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), "error");
    }
  });
}

/**
 * Sets the current user on the Sentry scope.
 * Call this after session resolution in admin routes.
 */
export function setSentryUser(user: {
  id: string;
  email: string;
  role: string;
}): void {
  Sentry.setUser({ id: user.id, email: user.email, role: user.role });
}

/**
 * Clears the Sentry user scope (call on logout).
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}