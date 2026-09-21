// src/app/api/sponsor/initialize/route.ts — HTTP adapter only
import { created, badRequest, serverError } from "@/lib/api-helpers";
import { getRequestMeta } from "@/lib/audit";
import { initializeSponsorshipSchema } from "@/lib/validators/sponsorship";
import { initializeSponsorship } from "@/services/sponsorship.service";
import { captureError } from "@/lib/sentry";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON or empty body.");

    const parsed = initializeSponsorshipSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    // The /sponsor/callback page is served by the frontend app (not this
    // backend's own domain) — same reasoning as the admin-login redirect in
    // middleware.ts, since the browser's Origin header isn't reliably
    // forwarded through the frontend's server-side proxy rewrite.
    const callbackUrl = "https://hasbulla4school.mikaelsoninitiative.org/sponsor/callback";

    const ctx = getRequestMeta(req);
    const result = await initializeSponsorship(parsed.data, callbackUrl, ctx);

    if (!result.success) return badRequest(result.error);
    return created({ authorizationUrl: result.authorizationUrl, reference: result.reference });
  } catch (err) {
    captureError(err, { route: "POST /api/sponsor/initialize" });
    return serverError();
  }
}
