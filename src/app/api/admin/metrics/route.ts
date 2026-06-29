import { ok, serverError }     from "@/lib/api-helpers";
import { getDashboardMetrics } from "@/services/metrics.service";
import { captureError }        from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getDashboardMetrics());
  } catch (err) {
    captureError(err, { route: "GET /api/admin/metrics" });
    return serverError();
  }
}