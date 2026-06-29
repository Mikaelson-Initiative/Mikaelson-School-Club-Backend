import { prisma } from "@/lib/prisma";
export type AuditAction = string;

export interface ListAuditOptions {
  actorId?:  string;
  model?:    string;
  action?:   AuditAction;
  recordId?: string;
  from?:     Date;
  to?:       Date;
  page:      number;
  limit:     number;
}

export const auditRepository = {
  async list({ actorId, model, action, recordId, from, to, page, limit }: ListAuditOptions) {
    const where = {
      ...(actorId  ? { actorId  } : {}),
      ...(model    ? { model    } : {}),
      ...(action   ? { action   } : {}),
      ...(recordId ? { recordId } : {}),
      ...((from || to) ? {
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to   ? { lte: to   } : {}),
        },
      } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  },
};