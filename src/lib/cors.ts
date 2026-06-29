// src/lib/cors.ts
// ─────────────────────────────────────────────────────────────────────────────
// CORS origin validation and header helpers.
// Reads allowed origins from ALLOWED_ORIGINS env var (comma-separated).
// Used in middleware.ts and in individual API routes for preflight handling.
// ─────────────────────────────────────────────────────────────────────────────

import { env } from "@/lib/env";

// Parse the comma-separated allowlist once at module load
const ALLOWED_ORIGINS: Set<string> = new Set(
  env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
);

// Always allow localhost variants in non-production
if (env.NODE_ENV !== "production") {
  ALLOWED_ORIGINS.add("http://localhost:3000");
  ALLOWED_ORIGINS.add("http://localhost:3001");
  ALLOWED_ORIGINS.add("http://127.0.0.1:3000");
}

/**
 * Returns true if the given origin is permitted.
 * A missing or null origin (e.g. server-to-server calls) is always allowed.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

/**
 * Returns the CORS headers for a given request origin.
 * If the origin is not in the allowlist, no CORS headers are returned,
 * which causes the browser to block the request.
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  if (!isAllowedOrigin(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // preflight cache: 24 hours
  };
}

/**
 * Handles an OPTIONS preflight request.
 * Call this at the top of any route that needs CORS support.
 */
export function handlePreflight(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;

  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

/**
 * Adds CORS headers to an existing Response.
 * Use this to wrap any Response before returning it from a route handler.
 */
export function withCors(response: Response, request: Request): Response {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}