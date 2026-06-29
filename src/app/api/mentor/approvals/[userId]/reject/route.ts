// src/app/api/mentor/approvals/[userId]/reject/route.ts
import { requireRole, ok, badRequest, serverError } from "@/lib/api-helpers";
import { rejectMember } from "@/services/user.service";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import type { RouteContext } from "@/types/api";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: RouteContext<{ userId: string }>
) {
  try {
    const session = await requireRole(["MENTOR"]);
    if (session instanceof Response) return session;

    const { userId } = context.params;
    if (!userId) {
      return badRequest("Missing student userId.");
    }

    const ctx = getRequestMeta(req);
    const result = await rejectMember(session.user.id, userId, ctx);
    if (!result.success) {
      return badRequest(result.error || "Rejection failed.");
    }

    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: "POST /api/mentor/approvals/[userId]/reject" });
    return serverError();
  }
}
