// src/app/api/admin/events/[id]/route.ts — HTTP adapter only
import { ok, badRequest, notFound, serverError, getSession } from "@/lib/api-helpers";
import { getRequestMeta }                                     from "@/lib/audit";
import { updateEventSchema }                                  from "@/lib/validators/event";
import { updateEvent, deleteEvent }                          from "@/services/event.service";
import { captureError }                                       from "@/lib/sentry";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const parsed  = updateEventSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await updateEvent(params.id, parsed.data, ctx);

    if (!result.success) return result.status === 404 ? notFound(result.error) : badRequest(result.error);
    return ok(result.data);
  } catch (err) {
    captureError(err, { route: `PATCH /api/admin/events/${params.id}` });
    return serverError();
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const ctx     = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result  = await deleteEvent(params.id, ctx);

    if (!result.success) return notFound(result.error);
    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: `DELETE /api/admin/events/${params.id}` });
    return serverError();
  }
}