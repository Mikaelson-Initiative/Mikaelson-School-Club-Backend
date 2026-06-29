// src/app/api/lessons/route.ts
import { requireSession, ok, serverError } from "@/lib/api-helpers";
import { listLessons } from "@/services/lesson.service";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const lessons = await listLessons();
    return ok(lessons);
  } catch (err) {
    captureError(err, { route: "GET /api/lessons" });
    return serverError();
  }
}
