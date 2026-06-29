// src/app/api/schools/[id]/members/route.ts
import { requireSession, ok, badRequest, serverError, notFound } from "@/lib/api-helpers";
import { getChapterRoster } from "@/services/school.service";
import { captureError } from "@/lib/sentry";
import type { RouteContext } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const { id } = context.params;
    if (!id) return badRequest("Missing chapter id.");

    const result = await getChapterRoster(id);
    if (!result.success) {
      return result.status === 404 ? notFound(result.error || "") : badRequest(result.error || "");
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "GET /api/schools/[id]/members" });
    return serverError();
  }
}
