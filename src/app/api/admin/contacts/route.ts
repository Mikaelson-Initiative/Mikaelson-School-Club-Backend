// src/app/api/admin/contacts/route.ts
import { requireRole, ok, serverError } from "@/lib/api-helpers";
import { listContacts }                 from "@/services/contact.service";
import { captureError }                 from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["ADMIN", "SUPERADMIN"]);
    if (session instanceof Response) return session;

    const { searchParams } = new URL(req.url);
    const result = await listContacts({
      status: searchParams.get("status") ?? undefined,
      type:   searchParams.get("type")   ?? undefined,
      page:   Math.max(1, Number(searchParams.get("page")  ?? "1")),
      limit:  Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50"))),
    });
    return ok(result);
  } catch (err) {
    captureError(err, { route: "GET /api/admin/contacts" });
    return serverError();
  }
}
