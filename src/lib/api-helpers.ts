// src/lib/api-helpers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared utilities for API route handlers.
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from "./auth";

// ── Standard JSON response builders ──────────────────────────────────────────

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function created<T>(data: T): Response {
  return Response.json(data, { status: 201 });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized"): Response {
  return Response.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): Response {
  return Response.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found"): Response {
  return Response.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error"): Response {
  return Response.json({ error: message }, { status: 500 });
}

// ── Session helpers ───────────────────────────────────────────────────────────

/** Returns the current session or null. */
export async function getSession() {
  return auth();
}

/**
 * Returns the session. If unauthenticated, returns a 401 Response directly.
 * Route handlers must check: if (session instanceof Response) return session;
 */
export async function requireSession(): Promise<
  import("next-auth").Session | Response
> {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  return session as import("next-auth").Session;
}

/**
 * Returns the session. If not SUPERADMIN, returns a 403 Response directly.
 */
export async function requireSuperAdmin(): Promise<
  import("next-auth").Session | Response
> {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  if (session.user.role !== "SUPERADMIN") {
    return forbidden("SUPERADMIN role required.");
  }
  return session as import("next-auth").Session;
}

/**
 * Returns the session if the user has one of the allowed roles.
 * SUPERADMIN and ADMIN roles are always permitted.
 */
export async function requireRole(
  allowedRoles: ("ADMIN" | "SUPERADMIN" | "STUDENT" | "MENTOR" | "CHAMPION")[]
): Promise<import("next-auth").Session | Response> {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const role = session.user.role;
  if (role === "SUPERADMIN" || role === "ADMIN" || allowedRoles.includes(role)) {
    return session as import("next-auth").Session;
  }
  return forbidden(`Access denied. Required roles: ${allowedRoles.join(", ")}`);
}

// ── Slug generator ────────────────────────────────────────────────────────────

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

// ── Reading time estimator ─────────────────────────────────────────────────────

export function estimateReadingTime(content: string): number {
  const WORDS_PER_MINUTE = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}