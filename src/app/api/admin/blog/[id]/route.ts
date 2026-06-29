import { ok, badRequest, notFound, serverError, getSession } from "@/lib/api-helpers";
import { getRequestMeta }    from "@/lib/audit";
import { updatePostSchema }  from "@/lib/validators/blog";
import { updatePost, deletePost } from "@/services/blog.service";
import { captureError }      from "@/lib/sentry";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const parsed  = updatePostSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await updatePost(params.id, parsed.data, ctx);
    if (!result.success) return result.status === 404 ? notFound(result.error) : badRequest(result.error);
    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "PATCH /api/admin/blog/:id" });
    return serverError();
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const ctx     = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result  = await deletePost(params.id, ctx);
    if (!result.success) return notFound(result.error);
    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: "DELETE /api/admin/blog/:id" });
    return serverError();
  }
}