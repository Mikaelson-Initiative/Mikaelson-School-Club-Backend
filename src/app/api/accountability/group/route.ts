// src/app/api/accountability/group/route.ts
import { requireSession, ok, badRequest, serverError } from "@/lib/api-helpers";
import { createAccountabilityGroup } from "@/services/accountability.service";
import { createGroupSchema } from "@/lib/validators/accountability";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const json = await req.json();
    const parsed = createGroupSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const result = await createAccountabilityGroup(session.user.id, parsed.data.name, parsed.data.memberIds);
    if (!result.success) {
      return badRequest(result.error || "Failed to create accountability group.");
    }

    return ok(result.data);
  } catch (err) {
    captureError(err, { route: "POST /api/accountability/group" });
    return serverError();
  }
}
