// src/app/api/accountability/nudge/route.ts
import { requireSession, ok, badRequest, serverError, notFound } from "@/lib/api-helpers";
import { nudgeUser } from "@/services/accountability.service";
import { nudgeSchema } from "@/lib/validators/accountability";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const json = await req.json();
    const parsed = nudgeSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const ctx = getRequestMeta(req);
    const result = await nudgeUser(session.user.id, parsed.data.targetUserId, parsed.data.message, ctx);

    if (!result.success) {
      if (result.status === 404) return notFound(result.error);
      return badRequest(result.error || "Failed to nudge user.");
    }

    return ok({ success: true, message: result.message });
  } catch (err) {
    captureError(err, { route: "POST /api/accountability/nudge" });
    return serverError();
  }
}
