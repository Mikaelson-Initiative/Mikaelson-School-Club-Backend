// src/app/api/admin/events/[id]/attendance/route.ts
import { requireRole, ok, badRequest, serverError, notFound, forbidden } from "@/lib/api-helpers";
import { markMeetingAttendance } from "@/services/event.service";
import { markAttendanceSchema } from "@/lib/validators/event";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import type { RouteContext } from "@/types/api";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const session = await requireRole(["MENTOR"]);
    if (session instanceof Response) return session;

    const { id } = context.params;
    if (!id) return badRequest("Missing event id.");

    const json = await req.json();
    const parsed = markAttendanceSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const ctx = getRequestMeta(req);
    const result = await markMeetingAttendance(
      session.user.id,
      id,
      parsed.data.userId,
      parsed.data.attended,
      ctx
    );

    if (!result.success) {
      if (result.status === 404) return notFound(result.error);
      if (result.status === 403) return forbidden(result.error);
      return badRequest(result.error || "Failed to mark attendance.");
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "POST /api/admin/events/[id]/attendance" });
    return serverError();
  }
}
