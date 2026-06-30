// src/app/api/admin/applications/route.ts
import { requireSession, ok, serverError } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";
import { listApplications }    from "@/services/application.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const { searchParams } = new URL(req.url);
    const result = await listApplications({
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page:   Math.max(1, Number(searchParams.get("page")  ?? "1")),
      limit:  Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20"))),
    });
    return ok(result);
  } catch (err) {
    captureError(err, { route: "GET /api/admin/applications" });
    return serverError();
  }
}
 