import { ok, created, badRequest, serverError, requireRole } from "@/lib/api-helpers";
import { getRequestMeta }    from "@/lib/audit";
import { createPostSchema }  from "@/lib/validators/blog";
import { listAdminPosts, createPost } from "@/services/blog.service";
import { captureError }      from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["ADMIN", "SUPERADMIN"]);
    if (session instanceof Response) return session;

    const { searchParams } = new URL(req.url);
    const published = searchParams.get("published");
    return ok(await listAdminPosts(published !== null ? published === "true" : undefined));
  } catch (err) {
    captureError(err, { route: "GET /api/admin/blog" });
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["ADMIN", "SUPERADMIN"]);
    if (session instanceof Response) return session;

    const parsed  = createPostSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await createPost(parsed.data, ctx);
    return created(result);
  } catch (err) {
    captureError(err, { route: "POST /api/admin/blog" });
    return serverError();
  }
}