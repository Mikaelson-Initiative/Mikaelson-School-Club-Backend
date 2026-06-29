// src/app/api/admin/volunteers/[id]/route.ts
import { ok, badRequest, serverError, forbidden, getSession, notFound } from "@/lib/api-helpers";
import { getRequestMeta }                                               from "@/lib/audit";
import { updateVolunteerSchema }                                        from "@/lib/validators/volunteer";
import { updateVolunteer, deleteVolunteer }                             from "@/services/volunteer.service";
import { captureError }                                                 from "@/lib/sentry";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
      return forbidden();
    }

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON or empty body.");

    const parsed = updateVolunteerSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const ctx    = { ...getRequestMeta(req), actorId: session.user.id, actorEmail: session.user.email };
    const result = await updateVolunteer(params.id, parsed.data, ctx);

    if (!result.success) {
      if (result.status === 404) return notFound(result.error);
      return badRequest(result.error);
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: `PATCH /api/admin/volunteers/${params.id}` });
    return serverError();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
      return forbidden();
    }

    const ctx    = { ...getRequestMeta(req), actorId: session.user.id, actorEmail: session.user.email };
    const result = await deleteVolunteer(params.id, ctx);

    if (!result.success) {
      if (result.status === 404) return notFound(result.error);
      return badRequest(result.error);
    }

    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: `DELETE /api/admin/volunteers/${params.id}` });
    return serverError();
  }
}
