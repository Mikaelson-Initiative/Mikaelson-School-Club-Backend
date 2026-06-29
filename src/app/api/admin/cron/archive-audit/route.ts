// src/app/api/admin/cron/archive-audit/route.ts
// POST /api/admin/cron/archive-audit
// ─────────────────────────────────────────────────────────────────────────────
// Monthly cron job: moves AuditLog entries older than 90 days into
// AuditLogArchive (cold storage) and deletes them from the hot table.
// This keeps the AuditLog table fast for dashboard queries.
//
// Add to vercel.json:
//   { "path": "/api/admin/cron/archive-audit", "schedule": "0 3 1 * *" }
//   (runs at 03:00 UTC on the 1st of every month)
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { ok, forbidden, serverError } from "@/lib/api-helpers";
import { env } from "@/lib/env";
import { captureError } from "@/lib/sentry";

const ARCHIVE_AFTER_DAYS = 90;
const BATCH_SIZE = 500; // process in batches to avoid memory pressure

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return forbidden("Invalid cron secret.");
  }

  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  let totalArchived = 0;

  try {
    // Process in batches to avoid OOM on large tables
    while (true) {
      const batch = await prisma.auditLog.findMany({
        where: { createdAt: { lt: cutoff } },
        take: BATCH_SIZE,
        orderBy: { createdAt: "asc" },
      });

      if (batch.length === 0) break;

      // Insert batch into archive table
      await prisma.auditLogArchive.createMany({
        data: batch.map((log: any) => ({
          id:         log.id,
          actorId:    log.actorId,
          actorEmail: log.actorEmail,
          action:     log.action,
          model:      log.model,
          recordId:   log.recordId,
          before:     log.before ?? undefined,
          after:      log.after  ?? undefined,
          ip:         log.ip,
          userAgent:  log.userAgent,
          createdAt:  log.createdAt,
        })),
        skipDuplicates: true, // safe to re-run if partially completed
      });

      // Delete archived records from the hot table
      const ids = batch.map((l: any) => l.id);
      await prisma.auditLog.deleteMany({ where: { id: { in: ids } } });

      totalArchived += batch.length;

      // Small delay between batches to avoid saturating the DB connection pool
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`[Cron/ArchiveAudit] Archived ${totalArchived} entries older than ${ARCHIVE_AFTER_DAYS} days.`);

    return ok({
      success: true,
      archived: totalArchived,
      cutoff: cutoff.toISOString(),
    });
  } catch (err) {
    captureError(err, { route: "POST /api/admin/cron/archive-audit" });
    return serverError();
  }
}