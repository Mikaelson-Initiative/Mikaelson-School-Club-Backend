// src/app/api/admin/schools/[id]/feature/route.ts
import { requireSuperAdmin, ok, badRequest, serverError, notFound } from "@/lib/api-helpers";
import { setChapterOfMonth } from "@/services/school.service";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import type { RouteContext } from "@/types/api";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const session = await requireSuperAdmin();
    if (session instanceof Response) return session;

    const { id } = context.params;
    if (!id) return badRequest("Missing chapter id.");

    const ctx = getRequestMeta(req);
    const result = await setChapterOfMonth(id, ctx);
    if (!result.success) {
      return result.status === 404 ? notFound(result.error || "") : badRequest(result.error || "");
    }

    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: "POST /api/admin/schools/[id]/feature" });
    return serverError();
  }
}
