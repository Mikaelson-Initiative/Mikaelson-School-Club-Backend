// src/app/api/habits/[id]/log/route.ts
import { requireSession, ok, badRequest, serverError, forbidden, notFound } from "@/lib/api-helpers";
import { logHabit } from "@/services/habit.service";
import { logHabitSchema } from "@/lib/validators/habit";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import type { RouteContext } from "@/types/api";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const { id } = context.params;
    if (!id) return badRequest("Missing habit id.");

    let loggedDateStr: string | undefined;
    try {
      const json = await req.json();
      const parsed = logHabitSchema.safeParse(json);
      if (parsed.success) {
        loggedDateStr = parsed.data.loggedDate;
      }
    } catch {
      // Body might be empty, ignore and default to today's date in service
    }

    const ctx = getRequestMeta(req);
    const result = await logHabit(session.user.id, id, loggedDateStr, ctx);

    if (!result.success) {
      if (result.status === 404) return notFound(result.error);
      if (result.status === 403) return forbidden(result.error);
      return badRequest(result.error || "Failed to log habit.");
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "POST /api/habits/[id]/log" });
    return serverError();
  }
}
