// src/app/api/admin/schools/route.ts — HTTP adapter only
import { ok, created, badRequest, serverError, getSession } from "@/lib/api-helpers";
import { getRequestMeta }                                    from "@/lib/audit";
import { createSchoolSchema }                                from "@/lib/validators/school";
import { listAdminSchools, createSchool }                   from "@/services/school.service";
import { captureError }                                      from "@/lib/sentry";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const result = await listAdminSchools({
      status:  searchParams.get("status")  ?? undefined,
      country: searchParams.get("country") ?? undefined,
    });
    return ok(result);
  } catch (err) {
    captureError(err, { route: "GET /api/admin/schools" });
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const parsed  = createSchoolSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await createSchool(parsed.data, ctx);

    if (!result.success) return badRequest(result.error);
    return created({ success: true, id: result.id });
  } catch (err) {
    captureError(err, { route: "POST /api/admin/schools" });
    return serverError();
  }
}
// Trigger TypeScript cache refresh