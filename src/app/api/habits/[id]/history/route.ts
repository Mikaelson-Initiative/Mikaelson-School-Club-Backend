// src/app/api/habits/[id]/history/route.ts
import { requireSession, ok, badRequest, serverError, forbidden, notFound } from "@/lib/api-helpers";
import { getHabitHistory } from "@/services/habit.service";
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
    if (!id) return badRequest("Missing habit id.");

    const result = await getHabitHistory(session.user.id, id);
    if (!result.success) {
      if (result.status === 404) return notFound(result.error);
      if (result.status === 403) return forbidden(result.error);
      return badRequest(result.error || "Failed to retrieve history.");
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "GET /api/habits/[id]/history" });
    return serverError();
  }
}
