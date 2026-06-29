// src/app/api/mentor/pending-approvals/route.ts
import { requireRole, ok, badRequest, serverError } from "@/lib/api-helpers";
import { getPendingApprovals } from "@/services/user.service";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole(["MENTOR"]);
    if (session instanceof Response) return session;

    const result = await getPendingApprovals(session.user.id);
    if (!result.success) {
      return badRequest(result.error || "Failed to list pending approvals.");
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "GET /api/mentor/pending-approvals" });
    return serverError();
  }
}
