// src/app/api/sponsor/verify/route.ts — HTTP adapter only
import { ok, badRequest, notFound, serverError } from "@/lib/api-helpers";
import { verifySponsorship } from "@/services/sponsorship.service";
import { captureError } from "@/lib/sentry";

export async function GET(req: Request) {
  try {
    const reference = new URL(req.url).searchParams.get("reference");
    if (!reference) return badRequest("Missing reference.");

    const result = await verifySponsorship(reference);
    if (!result.success) {
      return result.status === 404 ? notFound(result.error) : badRequest(result.error);
    }

    return ok({
      status: result.status,
      type: result.type,
      quantity: result.quantity,
      chapterName: result.chapterName,
      amountKobo: result.amountKobo,
      donorName: result.donorName,
    });
  } catch (err) {
    captureError(err, { route: "GET /api/sponsor/verify" });
    return serverError();
  }
}
