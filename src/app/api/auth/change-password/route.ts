// src/app/api/auth/change-password/route.ts
// POST — the signed-in admin changes their own password (confirms current first).
import { ok, badRequest, unauthorized, notFound, serverError, getSession } from "@/lib/api-helpers";
import { getRequestMeta }        from "@/lib/audit";
import { changePasswordSchema }  from "@/lib/validators/user";
import { changeOwnPassword }     from "@/services/user.service";
import { captureError }          from "@/lib/sentry";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) return unauthorized();

    const parsed = changePasswordSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const ctx    = { ...getRequestMeta(req), actorId: session.user.id, actorEmail: session.user.email };
    const result = await changeOwnPassword(session.user.id, parsed.data, ctx);

    if (!result.success) return result.status === 404 ? notFound(result.error) : badRequest(result.error);
    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/change-password" });
    return serverError();
  }
}
