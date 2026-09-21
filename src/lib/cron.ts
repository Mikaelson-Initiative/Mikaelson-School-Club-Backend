import crypto from "crypto";
import { env } from "@/lib/env";

// Constant-time comparison against CRON_SECRET, used by every /api/admin/cron/*
// route. A plain !== comparison leaks timing information about how many
// leading bytes matched.
export function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
