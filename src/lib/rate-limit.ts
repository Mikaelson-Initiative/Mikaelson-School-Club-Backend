// src/lib/rate-limit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting utility functions for checking IP and returning 429 responses.
// ─────────────────────────────────────────────────────────────────────────────

export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitedResponse(resetMs: number): Response {
  const retryAfter = Math.max(0, Math.ceil((resetMs - Date.now()) / 1000));
  return Response.json(
    {
      error: "Too many requests. Please wait before submitting again.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    }
  );
}
