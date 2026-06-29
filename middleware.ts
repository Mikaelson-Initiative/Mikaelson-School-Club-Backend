// middleware.ts  (root of project)
// ─────────────────────────────────────────────────────────────────────────────
// Edge Middleware — runs on Vercel edge network before any route handler.
//
// Responsibilities (in order):
//   1. Inject x-request-id for request tracing
//   2. CORS origin check — reject disallowed origins immediately
//   3. Content-Type enforcement on mutation endpoints
//   4. Auth token check — block unauthenticated /admin access
//   5. Per-route rate limiting via Upstash Redis
//   6. Security headers on every outgoing response
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Upstash clients ───────────────────────────────────────────────────────────

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const publicWriteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "rl:public_write",
});

const publicReadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, "1 m"),
  prefix: "rl:public_read",
});

const adminLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 m"),
  prefix: "rl:admin",
});

const adminUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 uploads per minute per user
  prefix: "rl:admin_upload",
});

// ── Allowed origins ───────────────────────────────────────────────────────────

function buildAllowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS ?? "http://localhost:3000";
  const origins = new Set(raw.split(",").map((o) => o.trim()).filter(Boolean));
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3001");
    origins.add("http://127.0.0.1:3000");
  }
  return origins;
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // server-to-server; no Origin header = allowed
  return ALLOWED_ORIGINS.has(origin);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function addSecurityHeaders(res: NextResponse, requestId: string): NextResponse {
  res.headers.set("X-Request-Id", requestId);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return res;
}

function addCorsHeaders(res: NextResponse, origin: string | null): NextResponse {
  if (!origin || !isAllowedOrigin(origin)) return res;
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Vary", "Origin");
  return res;
}

function classifyRoute(pathname: string) {
  if (pathname === "/api/admin/upload") return "admin_upload" as const;
  if (pathname === "/api/admin/auth") return "other" as const;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) return "admin" as const;
  if (pathname === "/api/apply" || pathname === "/api/contact") return "public_write" as const;
  if (
    pathname.startsWith("/api/blog") ||
    pathname.startsWith("/api/events") ||
    pathname.startsWith("/api/schools") ||
    pathname.startsWith("/api/team")
  ) return "public_read" as const;
  return "other" as const;
}

function logBreach(req: NextRequest, ip: string, tier: string) {
  fetch(`${req.nextUrl.origin}/api/internal/log-breach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": process.env.CRON_SECRET || "",
    },
    body: JSON.stringify({
      ip,
      route: req.nextUrl.pathname,
      userAgent: req.headers.get("user-agent"),
      limitKey: tier,
    }),
  }).catch(() => {});
}

// ── Main middleware ───────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const requestId = generateRequestId();
  const { pathname } = req.nextUrl;
  const method = req.method;
  const origin = req.headers.get("origin");
  const ip = getClientIp(req);
  const tier = classifyRoute(pathname);

  // ── 1. Handle CORS preflight ────────────────────────────────────────────────
  if (method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    const preflightRes = new NextResponse(null, { status: 204 });
    addCorsHeaders(preflightRes, origin);
    preflightRes.headers.set("Access-Control-Max-Age", "86400");
    return preflightRes;
  }

  // ── 2. CORS origin check on all other requests ──────────────────────────────
  if (origin && !isAllowedOrigin(origin)) {
    const res = NextResponse.json(
      { error: "Origin not allowed." },
      { status: 403 }
    );
    addSecurityHeaders(res, requestId);
    return res;
  }

  // ── 3. Content-Type enforcement on mutation routes ──────────────────────────
  if (
    (method === "POST" || method === "PATCH" || method === "PUT") &&
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/admin/upload") // upload uses multipart
  ) {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const res = NextResponse.json(
        { error: "Content-Type must be application/json." },
        { status: 415 }
      );
      addSecurityHeaders(res, requestId);
      addCorsHeaders(res, origin);
      return res;
    }
  }

  // ── 4. Admin routes: verify session token ──────────────────────────────────
  if (tier === "admin") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET! });

    if (!token || (token.role !== "ADMIN" && token.role !== "SUPERADMIN")) {
      if (pathname.startsWith("/api/")) {
        const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        addSecurityHeaders(res, requestId);
        addCorsHeaders(res, origin);
        return res;
      }
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Rate limit by userId
    const userId = (token.sub as string) ?? ip;
    const { success, reset } = await adminLimiter.limit(userId);
    if (!success) {
      logBreach(req, ip, tier);
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      const res = NextResponse.json(
        { error: "Rate limit exceeded.", retryAfter },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(retryAfter));
      addSecurityHeaders(res, requestId);
      addCorsHeaders(res, origin);
      return res;
    }

    // Forward request ID to route handler via header
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-request-id", requestId);
    requestHeaders.set("x-actor-id", token.sub ?? "");
    requestHeaders.set("x-actor-role", String(token.role ?? ""));

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    addSecurityHeaders(res, requestId);
    addCorsHeaders(res, origin);
    return res;
  }

  // ── 4.5 Admin upload rate limiting ─────────────────────────────────────────
  if (tier === "admin_upload") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET! });

    if (!token || (token.role !== "ADMIN" && token.role !== "SUPERADMIN")) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      addSecurityHeaders(res, requestId);
      addCorsHeaders(res, origin);
      return res;
    }

    const userId = (token.sub as string) ?? ip;
    const { success, reset } = await adminUploadLimiter.limit(userId);
    if (!success) {
      logBreach(req, ip, tier);
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      const res = NextResponse.json(
        { error: "Upload limit exceeded. Please try again later.", retryAfter },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(retryAfter));
      addSecurityHeaders(res, requestId);
      addCorsHeaders(res, origin);
      return res;
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-request-id", requestId);
    requestHeaders.set("x-actor-id", token.sub ?? "");
    requestHeaders.set("x-actor-role", String(token.role ?? ""));

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    addSecurityHeaders(res, requestId);
    addCorsHeaders(res, origin);
    return res;
  }

  // ── 5. Public write: tight rate limit ──────────────────────────────────────
  if (tier === "public_write") {
    const { success, reset } = await publicWriteLimiter.limit(ip);
    if (!success) {
      logBreach(req, ip, tier);
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      const res = NextResponse.json(
        {
          error: "Too many requests. Please wait before submitting again.",
          retryAfter,
        },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(retryAfter));
      addSecurityHeaders(res, requestId);
      addCorsHeaders(res, origin);
      return res;
    }
  }

  // ── 6. Public read: generous rate limit ────────────────────────────────────
  if (tier === "public_read") {
    const { success, reset } = await publicReadLimiter.limit(ip);
    if (!success) {
      logBreach(req, ip, tier);
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      const res = NextResponse.json(
        { error: "Rate limit exceeded.", retryAfter },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(retryAfter));
      addSecurityHeaders(res, requestId);
      addCorsHeaders(res, origin);
      return res;
    }
  }

  // ── Pass through ───────────────────────────────────────────────────────────
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  addSecurityHeaders(res, requestId);
  addCorsHeaders(res, origin);
  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/apply",
    "/api/contact",
    "/api/blog/:path*",
    "/api/events/:path*",
    "/api/schools/:path*",
    "/api/team/:path*",
  ],
};