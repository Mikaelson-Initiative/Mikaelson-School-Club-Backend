import { ok, serverError, requireRole } from "@/lib/api-helpers";
import { getDashboardMetrics } from "@/services/metrics.service";
import { captureError }        from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole(["ADMIN", "SUPERADMIN"]);
    if (session instanceof Response) return session;

    return ok(await getDashboardMetrics());
  } catch (err) {
    captureError(err, { route: "GET /api/admin/metrics" });
    return serverError();
  }
}