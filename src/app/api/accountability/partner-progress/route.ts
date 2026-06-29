// src/app/api/accountability/partner-progress/route.ts
import { requireSession, ok, serverError } from "@/lib/api-helpers";
import { getPartnerAndGroupProgress } from "@/services/accountability.service";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const progress = await getPartnerAndGroupProgress(session.user.id);
    return ok(progress);
  } catch (err) {
    captureError(err, { route: "GET /api/accountability/partner-progress" });
    return serverError();
  }
}
