// src/app/api/auth/verify/route.ts
import { verifyEmail } from "@/services/user.service";
import { badRequest, serverError } from "@/lib/api-helpers";
import { getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) {
      return badRequest("Verification token is required.");
    }

    const ctx = getRequestMeta(req);
    const result = await verifyEmail(token, ctx);
    if (!result.success) {
      return badRequest(result.error);
    }

    // Redirect to login page upon successful verification
    const loginUrl = new URL("/admin/login?verified=true", env.NEXTAUTH_URL || req.url);
    return Response.redirect(loginUrl.toString(), 302);
  } catch (err) {
    captureError(err, { route: "GET /api/auth/verify" });
    return serverError();
  }
}
