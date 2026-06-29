// src/app/api/auth/logout/route.ts
import { ok, getSession } from "@/lib/api-helpers";
import { cookies } from "next/headers";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    
    if (session?.user) {
      const ctx = getRequestMeta(req);
      await writeAuditLog({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "LOGOUT",
        model: "User",
        recordId: session.user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }

    const cookieStore = cookies();
    const cookieNames = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.callback-url",
      "next-auth.csrf-token",
    ];

    for (const name of cookieNames) {
      cookieStore.set({
        name,
        value: "",
        maxAge: -1,
        path: "/",
      });
      cookieStore.delete(name);
    }

    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/logout" });
    return ok({ success: true });
  }
}
