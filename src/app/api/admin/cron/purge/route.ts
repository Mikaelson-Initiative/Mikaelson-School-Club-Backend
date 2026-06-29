// src/app/api/admin/cron/purge/route.ts
// POST /api/admin/cron/purge
// ─────────────────────────────────────────────────────────────────────────────
// Nightly cron job: hard-deletes soft-deleted records older than 30 days
// across 6 models: User, SchoolChapter, Application, Event, BlogPost, TeamMember.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { ok, forbidden, serverError } from "@/lib/api-helpers";
import { env } from "@/lib/env";
import { captureError } from "@/lib/sentry";

const PURGE_AFTER_DAYS = 30;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return forbidden("Invalid cron secret.");
  }

  const cutoff = new Date(Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  try {
    // 1. Nullify actorId in AuditLog for users to be purged to avoid FK constraint violations
    await prisma.$executeRawUnsafe(
      `UPDATE "AuditLog" SET "actorId" = NULL WHERE "actorId" IN (SELECT id FROM "User" WHERE "isDeleted" = true AND "deletedAt" < $1)`,
      cutoff
    );

    // 2. Perform hard deletions using raw SQL to bypass the soft-delete extensions
    const tables = ["User", "SchoolChapter", "Application", "Event", "BlogPost", "TeamMember"];
    const results: Record<string, number> = {};

    for (const table of tables) {
      const deletedCount = await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "isDeleted" = true AND "deletedAt" < $1`,
        cutoff
      );
      results[table] = deletedCount;
    }

    console.log(`[Cron/Purge] Hard-purged records older than ${PURGE_AFTER_DAYS} days:`, results);

    return ok({
      success: true,
      purged: results,
      cutoff: cutoff.toISOString(),
    });
  } catch (err) {
    captureError(err, { route: "POST /api/admin/cron/purge" });
    return serverError();
  }
}
