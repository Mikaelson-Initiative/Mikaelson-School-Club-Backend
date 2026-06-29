// src/app/api/apply/route.ts — HTTP adapter only
import { created, badRequest, serverError } from "@/lib/api-helpers";
import { getRequestMeta }                   from "@/lib/audit";
import { applySchema }                      from "@/lib/validators/application";
import { submitApplication }                from "@/services/application.service";
import { captureError }                     from "@/lib/sentry";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON or empty body.");

    const parsed = applySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const ctx    = getRequestMeta(req);
    const result = await submitApplication(parsed.data, ctx);

    if (!result.success) return badRequest(result.error);
    return created({ success: true, id: result.id });
  } catch (err) {
    captureError(err, { route: "POST /api/apply" });
    return serverError();
  }
}