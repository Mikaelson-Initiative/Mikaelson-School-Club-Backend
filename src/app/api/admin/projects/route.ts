// src/app/api/admin/projects/route.ts
import { requireSession, ok, badRequest, serverError, created } from "@/lib/api-helpers";
import { createProject, listProjects } from "@/services/project.service";
import { createProjectSchema } from "@/lib/validators/project";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const projects = await listProjects();
    return ok(projects);
  } catch (err) {
    captureError(err, { route: "GET /api/admin/projects" });
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const json = await req.json();
    const parsed = createProjectSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const ctx = getRequestMeta(req);
    const result = await createProject(parsed.data, ctx);

    return created(result.data);
  } catch (err) {
    captureError(err, { route: "POST /api/admin/projects" });
    return serverError();
  }
}
