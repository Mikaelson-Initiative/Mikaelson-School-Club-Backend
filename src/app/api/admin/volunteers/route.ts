// src/app/api/admin/volunteers/route.ts
import { ok, serverError, forbidden, getSession } from "@/lib/api-helpers";
import { listVolunteers }                         from "@/services/volunteer.service";
import { captureError }                           from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
      return forbidden();
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page   = Math.max(1, parseInt(searchParams.get("page")   || "1",  10) || 1);
    const limit  = Math.max(1, Math.min(100, parseInt(searchParams.get("limit")  || "10", 10) || 10));

    const result = await listVolunteers({
      status,
      search,
      page,
      limit,
    });

    return ok(result);
  } catch (err) {
    captureError(err, { route: "GET /api/admin/volunteers" });
    return serverError();
  }
}
