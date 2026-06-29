import { ok, badRequest, forbidden, notFound, serverError, getSession } from "@/lib/api-helpers";
import { getRequestMeta }   from "@/lib/audit";
import { updateUserSchema } from "@/lib/validators/user";
import { updateUser, deleteUser } from "@/services/user.service";
import { captureError }     from "@/lib/sentry";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "SUPERADMIN") return forbidden();
    const parsed = updateUserSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await updateUser(params.id, parsed.data, ctx, session?.user?.id);
    if (!result.success) {
      if (result.status === 403) return forbidden(result.error);
      if (result.status === 404) return notFound(result.error);
      return badRequest(result.error);
    }
    return ok(result);
  } catch (err) {
    captureError(err, { route: "PATCH /api/admin/users/:id" });
    return serverError();
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "SUPERADMIN") return forbidden();
    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await deleteUser(params.id, ctx, session?.user?.id);
    if (!result.success) {
      if (result.status === 403) return forbidden(result.error);
      return notFound(result.error);
    }
    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: "DELETE /api/admin/users/:id" });
    return serverError();
  }
}