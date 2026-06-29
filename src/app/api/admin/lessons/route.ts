// src/app/api/admin/lessons/route.ts
import { requireSession, ok, badRequest, serverError, created } from "@/lib/api-helpers";
import { createLesson, listLessons } from "@/services/lesson.service";
import { createLessonSchema } from "@/lib/validators/lesson";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const lessons = await listLessons();
    return ok(lessons);
  } catch (err) {
    captureError(err, { route: "GET /api/admin/lessons" });
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const json = await req.json();
    const parsed = createLessonSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const ctx = getRequestMeta(req);
    const result = await createLesson(parsed.data, ctx);

    return created(result.data);
  } catch (err) {
    captureError(err, { route: "POST /api/admin/lessons" });
    return serverError();
  }
}
