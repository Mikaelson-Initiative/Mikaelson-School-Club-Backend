// src/app/api/members/me/meetings/route.ts
import { requireSession, ok, serverError } from "@/lib/api-helpers";
import { getUpcomingChapterMeetings } from "@/services/event.service";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const result = await getUpcomingChapterMeetings(session.user.id);
    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "GET /api/members/me/meetings" });
    return serverError();
  }
}
