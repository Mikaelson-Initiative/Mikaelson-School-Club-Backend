import { ok, badRequest, notFound, serverError, getSession } from "@/lib/api-helpers";
import { getRequestMeta }                                     from "@/lib/audit";
import { updateApplicationSchema }                            from "@/lib/validators/application";
import { updateApplication, deleteApplication }              from "@/services/application.service";
import { captureError }                                       from "@/lib/sentry";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const parsed  = updateApplicationSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await updateApplication(params.id, parsed.data, ctx);

    if (!result.success) return result.status === 404 ? notFound(result.error) : badRequest(result.error);
    return ok(result.data);
  } catch (err) {
    captureError(err, { route: `PATCH /api/admin/applications/${params.id}` });
    return serverError();
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const ctx     = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result  = await deleteApplication(params.id, ctx);

    if (!result.success) return notFound(result.error);
    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: `DELETE /api/admin/applications/${params.id}` });
    return serverError();
  }
}