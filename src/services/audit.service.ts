import { auditRepository }  from "@/repositories/audit.repository";
import type { AuditAction } from "@/repositories/audit.repository";

export async function listAuditLogs(options: {
  actorId?:  string;
  model?:    string;
  action?:   string;
  recordId?: string;
  from?:     string;
  to?:       string;
  page:      number;
  limit:     number;
}) {
  const { items, total } = await auditRepository.list({
    actorId:  options.actorId,
    model:    options.model,
    action:   options.action as AuditAction | undefined,
    recordId: options.recordId,
    from:     options.from ? new Date(options.from) : undefined,
    to:       options.to   ? new Date(options.to)   : undefined,
    page:     options.page,
    limit:    options.limit,
  });

  return {
    logs:        items,
    total,
    page:        options.page,
    limit:       options.limit,
    hasNextPage: (options.page - 1) * options.limit + items.length < total,
    hasPrevPage: options.page > 1,
  };
}