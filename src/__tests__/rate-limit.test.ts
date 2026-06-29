// src/__tests__/rate-limit.test.ts
// Tests that rate limit helper functions behave correctly.

import { describe, it, expect } from "vitest";
import { getClientIp, rateLimitedResponse } from "@/lib/rate-limit";

describe("getClientIp", () => {
  it("returns the first IP from x-forwarded-for", () => {
    const req = new Request("http://localhost/api/apply", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("http://localhost/api/apply", {
      headers: { "x-real-ip": "203.0.113.2" },
    });
    expect(getClientIp(req)).toBe("203.0.113.2");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    const req = new Request("http://localhost/api/apply");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("rateLimitedResponse", () => {
  it("returns status 429", () => {
    const res = rateLimitedResponse(Date.now() + 60000);
    expect(res.status).toBe(429);
  });

  it("sets Retry-After header", async () => {
    const resetMs = Date.now() + 30000; // 30 seconds from now
    const res = rateLimitedResponse(resetMs);
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(30);
  });

  it("includes error message in JSON body", async () => {
    const res = rateLimitedResponse(Date.now() + 10000);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.retryAfter).toBeDefined();
  });
});