// src/lib/audit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Audit trail logging utilities using the Prisma client.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

export interface AuditLogPayload {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  model: string;
  recordId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Extracts client IP and user agent metadata from request headers.
 */
export function getRequestMeta(req: Request): { ip: string; userAgent: string } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  return { ip, userAgent };
}

/**
 * Creates an entry in the AuditLog database table.
 */
export async function writeAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId:    payload.actorId    ?? null,
        actorEmail: payload.actorEmail ?? null,
        action:     payload.action,
        model:      payload.model,
        recordId:   payload.recordId,
        before:     payload.before     ?? undefined,
        after:      payload.after      ?? undefined,
        ip:         payload.ip         ?? null,
        userAgent:  payload.userAgent  ?? null,
      },
    });
  } catch (error) {
    // Audit log failures should not fail the primary transaction. Log and continue.
    console.error("Failed to write audit log:", error);
  }
}
