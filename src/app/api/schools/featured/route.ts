// src/app/api/schools/featured/route.ts
import { ok, serverError, notFound } from "@/lib/api-helpers";
import { getFeaturedChapter } from "@/services/school.service";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const featured = await getFeaturedChapter();
    if (!featured) {
      return notFound("No featured chapter of the month.");
    }
    return ok(featured);
  } catch (err) {
    captureError(err, { route: "GET /api/schools/featured" });
    return serverError();
  }
}
