// src/lib/restore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generic soft-delete restore handler — shared by all [id]/restore routes.
// Uses a fixed allowlist of table names to prevent SQL injection from the
// model string (never interpolate user input directly into raw SQL).
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { ok, forbidden, notFound, serverError, getSession } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";

const RESTORE_WINDOW_DAYS = 30;

// Safe, fixed allowlist — never derived from user input
const ALLOWED_MODELS: Record<string, string> = {
  SchoolChapter: "SchoolChapter",
  Application:   "Application",
  Event:         "Event",
  BlogPost:      "BlogPost",
  TeamMember:    "TeamMember",
  User:          "User",
};

export async function handleRestore(
  req: Request,
  model: string,
  recordId: string
): Promise<Response> {
  try {
    const session = await getSession();

    if (session?.user?.role !== "SUPERADMIN") {
      return forbidden("Only SUPERADMIN can restore deleted records.");
    }

    const tableName = ALLOWED_MODELS[model];
    if (!tableName) {
      return serverError();
    }

    // Bypass soft-delete extension to find the deleted record.
    // tableName comes from the fixed, safe ALLOWED_MODELS map above, not user input.
    // recordId is passed as a parameterized argument to prevent SQL injection.
    type RawRow = { id: string; deletedAt: Date | null };

    const records = await prisma.$queryRawUnsafe(
      `SELECT id, "deletedAt" FROM "${tableName}" WHERE id = $1 LIMIT 1`,
      recordId
    ) as RawRow[];
    const record = records[0];

    if (!record) return notFound(`${model} not found.`);
    if (!record.deletedAt) return notFound(`${model} is not deleted — nothing to restore.`);

    const daysSinceDelete =
      (Date.now() - new Date(record.deletedAt).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceDelete > RESTORE_WINDOW_DAYS) {
      return forbidden(
        `Restore window (${RESTORE_WINDOW_DAYS} days) has expired. This record has been permanently purged.`
      );
    }

    // Fully parameterised restore — tableName from allowlist, recordId parameterized.
    await prisma.$executeRawUnsafe(
      `UPDATE "${tableName}" SET "isDeleted"=false,"deletedAt"=NULL,"updatedAt"=NOW() WHERE id=$1`,
      recordId
    );

    const { ip, userAgent } = getRequestMeta(req);
    await writeAuditLog({
      actorId:    session.user.id,
      actorEmail: session.user.email,
      action:     "RESTORE",
      model,
      recordId,
      after:      { restoredAt: new Date().toISOString() },
      ip,
      userAgent,
    });

    return ok({ success: true, message: `${model} restored successfully.` });
  } catch (err) {
    captureError(err, { route: `POST /restore ${model}/${recordId}` });
    return serverError();
  }
}