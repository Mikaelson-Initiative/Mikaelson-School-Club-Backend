// src/app/api/admin/sponsorships/route.ts
import { ok, serverError, forbidden, getSession } from "@/lib/api-helpers";
import { listSponsorships } from "@/services/sponsorship.service";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
      return forbidden();
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") as "PENDING" | "SUCCESS" | "FAILED" | null) || undefined;
    const type = (searchParams.get("type") as "STUDENT" | "CHAPTER" | null) || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10) || 20));

    const result = await listSponsorships({ status, type, page, limit });
    return ok(result);
  } catch (err) {
    captureError(err, { route: "GET /api/admin/sponsorships" });
    return serverError();
  }
}
