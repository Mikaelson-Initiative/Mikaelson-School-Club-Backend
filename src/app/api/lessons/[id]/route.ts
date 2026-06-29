// src/app/api/lessons/[id]/route.ts
import { requireSession, ok, serverError, notFound, badRequest } from "@/lib/api-helpers";
import { getLesson } from "@/services/lesson.service";
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
    if (!id) return badRequest("Missing lesson id.");

    const lesson = await getLesson(id);
    if (!lesson) return notFound("Lesson not found.");

    return ok(lesson);
  } catch (err) {
    captureError(err, { route: "GET /api/lessons/[id]" });
    return serverError();
  }
}
