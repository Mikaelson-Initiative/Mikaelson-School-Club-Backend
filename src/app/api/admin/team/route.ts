import { ok, created, badRequest, serverError, requireRole } from "@/lib/api-helpers";
import { getRequestMeta }        from "@/lib/audit";
import { createTeamMemberSchema } from "@/lib/validators/team";
import { listAdminTeam, createTeamMember } from "@/services/team.service";
import { captureError }          from "@/lib/sentry";

export async function GET() {
  try {
    const session = await requireRole(["ADMIN", "SUPERADMIN"]);
    if (session instanceof Response) return session;

    return ok(await listAdminTeam());
  } catch (err) {
    captureError(err, { route: "GET /api/admin/team" });
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["ADMIN", "SUPERADMIN"]);
    if (session instanceof Response) return session;

    const parsed  = createTeamMemberSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    const ctx    = { ...getRequestMeta(req), actorId: session?.user?.id, actorEmail: session?.user?.email };
    const result = await createTeamMember(parsed.data, ctx);
    if (!result.success) return badRequest(result.error);
    return created({ success: true, id: result.id });
  } catch (err) {
    captureError(err, { route: "POST /api/admin/team" });
    return serverError();
  }
}