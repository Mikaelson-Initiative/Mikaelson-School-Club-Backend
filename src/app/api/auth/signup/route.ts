// src/app/api/auth/signup/route.ts
import { created, badRequest, serverError } from "@/lib/api-helpers";
import { signupSchema } from "@/lib/validators/user";
import { signupUser } from "@/services/user.service";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = signupSchema.safeParse(json);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const ctx = getRequestMeta(req);
    const result = await signupUser(parsed.data, ctx);

    if (!result.success) {
      return badRequest(result.error);
    }

    return created(result);
  } catch (err) {
    captureError(err, { route: "POST /api/auth/signup" });
    return serverError();
  }
}
