import { ok, badRequest, notFound, serverError, getSession } from "@/lib/api-helpers";
import { getRequestMeta }                                     from "@/lib/audit";
import { updateContactSchema }                                from "@/lib/validators/contact";
import { updateContact }                                      from "@/services/contact.service";
import { captureError }                                       from "@/lib/sentry";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const parsed  = updateContactSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await updateContact(params.id, parsed.data, ctx);

    if (!result.success) return result.status === 404 ? notFound(result.error) : badRequest(result.error);
    return ok(result.data);
  } catch (err) {
    captureError(err, { route: `PATCH /api/admin/contacts/${params.id}` });
    return serverError();
  }
}