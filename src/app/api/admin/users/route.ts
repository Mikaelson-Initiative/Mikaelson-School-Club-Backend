import { ok, created, badRequest, forbidden, serverError, getSession } from "@/lib/api-helpers";
import { getRequestMeta }    from "@/lib/audit";
import { createUserSchema }  from "@/lib/validators/user";
import { listUsers, createUser } from "@/services/user.service";
import { captureError }      from "@/lib/sentry";

export async function GET() {
  try {
    const session = await getSession();
    if (session?.user?.role !== "SUPERADMIN") return forbidden();
    return ok(await listUsers());
  } catch (err) {
    captureError(err, { route: "GET /api/admin/users" });
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "SUPERADMIN") return forbidden();
    const parsed = createUserSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await createUser(parsed.data, ctx);
    if (!result.success) return badRequest(result.error);
    return created(result);
  } catch (err) {
    captureError(err, { route: "POST /api/admin/users" });
    return serverError();
  }
}