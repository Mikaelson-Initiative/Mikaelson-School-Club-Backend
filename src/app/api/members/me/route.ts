// src/app/api/members/me/route.ts
import { requireSession, ok, badRequest, serverError, notFound } from "@/lib/api-helpers";
import { getMemberProfile, updateMemberProfile } from "@/services/user.service";
import { updateProfileSchema } from "@/lib/validators/user";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const profile = await getMemberProfile(session.user.id);
    if (!profile) return notFound("Profile not found.");

    return ok(profile);
  } catch (err) {
    captureError(err, { route: "GET /api/members/me" });
    return serverError();
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const json = await req.json();
    const parsed = updateProfileSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const ctx = getRequestMeta(req);
    const result = await updateMemberProfile(session.user.id, parsed.data, ctx);

    if (!result.success) {
      return badRequest(result.error || "Failed to update profile.");
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "PATCH /api/members/me" });
    return serverError();
  }
}
