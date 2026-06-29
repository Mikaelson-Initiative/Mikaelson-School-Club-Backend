// src/app/api/schools/[id]/projects/route.ts
import { requireSession, ok, badRequest, serverError } from "@/lib/api-helpers";
import { listProjectsByChapter } from "@/services/project.service";
import { captureError } from "@/lib/sentry";
import type { RouteContext } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const { id } = context.params;
    if (!id) return badRequest("Missing chapter id.");

    const projects = await listProjectsByChapter(id);
    return ok(projects);
  } catch (err) {
    captureError(err, { route: "GET /api/schools/[id]/projects" });
    return serverError();
  }
}
