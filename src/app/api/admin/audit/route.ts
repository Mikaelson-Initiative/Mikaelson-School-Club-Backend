// src/app/api/admin/audit/route.ts — HTTP adapter only
import { ok, serverError } from "@/lib/api-helpers";
import { listAuditLogs }   from "@/services/audit.service";
import { captureError }    from "@/lib/sentry";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return ok(await listAuditLogs({
      actorId:  searchParams.get("actorId")  ?? undefined,
      model:    searchParams.get("model")    ?? undefined,
      action:   searchParams.get("action")   ?? undefined,
      recordId: searchParams.get("recordId") ?? undefined,
      from:     searchParams.get("from")     ?? undefined,
      to:       searchParams.get("to")       ?? undefined,
      page:     Math.max(1, Number(searchParams.get("page")  ?? "1")),
      limit:    Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50"))),
    }));
  } catch (err) {
    captureError(err, { route: "GET /api/admin/audit" });
    return serverError();
  }
}