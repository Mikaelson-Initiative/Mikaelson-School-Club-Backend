// src/app/api/admin/projects/[id]/route.ts
import { requireSession, ok, badRequest, serverError, notFound } from "@/lib/api-helpers";
import { updateProject, deleteProject } from "@/services/project.service";
import { updateProjectSchema } from "@/lib/validators/project";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import type { RouteContext } from "@/types/api";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const { id } = context.params;
    if (!id) return badRequest("Missing project id.");

    const json = await req.json();
    const parsed = updateProjectSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const ctx = getRequestMeta(req);
    const result = await updateProject(id, parsed.data, ctx);
    if (!result.success) {
      return result.status === 404 ? notFound(result.error || "") : badRequest(result.error || "");
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "PATCH /api/admin/projects/[id]" });
    return serverError();
  }
}

export async function DELETE(
  req: Request,
  context: RouteContext<{ id: string }>
) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const { id } = context.params;
    if (!id) return badRequest("Missing project id.");

    const ctx = getRequestMeta(req);
    const result = await deleteProject(id, ctx);
    if (!result.success) {
      return result.status === 404 ? notFound(result.error || "") : badRequest(result.error || "");
    }

    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: "DELETE /api/admin/projects/[id]" });
    return serverError();
  }
}
