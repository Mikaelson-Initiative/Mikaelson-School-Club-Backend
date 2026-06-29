import { ok, badRequest, serverError } from "@/lib/api-helpers";
import { getRequestMeta }              from "@/lib/audit";
import { contactSchema }               from "@/lib/validators/contact";
import { submitContact }               from "@/services/contact.service";
import { captureError }                from "@/lib/sentry";

export async function POST(req: Request) {
  try {
    const parsed = contactSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const ctx    = getRequestMeta(req);
    const result = await submitContact(parsed.data, ctx);
    return ok(result);
  } catch (err) {
    captureError(err, { route: "POST /api/contact" });
    return serverError();
  }
}