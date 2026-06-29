import { ok, created, badRequest, serverError, getSession } from "@/lib/api-helpers";
import { getRequestMeta }                                    from "@/lib/audit";
import { createEventSchema }                                 from "@/lib/validators/event";
import { listAdminEvents, createEvent }                     from "@/services/event.service";
import { captureError }                                      from "@/lib/sentry";

export async function GET() {
  try {
    return ok(await listAdminEvents());
  } catch (err) {
    captureError(err, { route: "GET /api/admin/events" });
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const parsed  = createEventSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await createEvent(parsed.data, ctx);
    return created({ success: true, id: result.id });
  } catch (err) {
    captureError(err, { route: "POST /api/admin/events" });
    return serverError();
  }
}