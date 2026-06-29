// src/app/api/accountability/partner/route.ts
import { requireSession, ok, badRequest, serverError } from "@/lib/api-helpers";
import { setAccountabilityPartner } from "@/services/accountability.service";
import { setPartnerSchema } from "@/lib/validators/accountability";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const json = await req.json();
    const parsed = setPartnerSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const result = await setAccountabilityPartner(session.user.id, parsed.data.partnerId);
    if (!result.success) {
      return badRequest(result.error || "Failed to set accountability partner.");
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "POST /api/accountability/partner" });
    return serverError();
  }
}
