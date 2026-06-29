// src/app/api/health/route.ts
// GET /api/health — No auth required. Used by uptime monitors and deployment checks.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

const startTime = Date.now();

export async function GET() {
  const checks: { database: "ok" | "error"; redis?: "ok" | "error" } = {
    database: "ok",
  };

  let overallStatus: "ok" | "degraded" | "down" = "ok";

  // ── Database ping ──────────────────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    checks.database = "error";
    overallStatus = "down";
  }

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const body = {
    status: overallStatus,
    uptime,
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version ?? "unknown",
  };

  return Response.json(body, {
    status: overallStatus === "down" ? 503 : 200,
    headers: {
      // Do not cache health checks
      "Cache-Control": "no-store",
    },
  });
}