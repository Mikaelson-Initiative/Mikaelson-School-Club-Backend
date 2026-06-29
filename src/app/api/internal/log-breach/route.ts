// src/app/api/internal/log-breach/route.ts
import { prisma } from "@/lib/prisma";
import { badRequest, ok, unauthorized } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const key = req.headers.get("x-internal-key");
    if (!key || key !== process.env.CRON_SECRET) {
      return unauthorized("Unauthorized internal call.");
    }

    const json = await req.json();
    const { ip, route, userAgent, limitKey } = json;

    if (!ip || !route) {
      return badRequest("Missing required fields (ip, route).");
    }

    const breach = await (prisma as any).rateLimitBreach.create({
      data: {
        ip,
        route,
        userAgent: userAgent || null,
        limitKey: limitKey || null,
      },
    });

    return ok({ success: true, id: breach.id });
  } catch (err) {
    captureError(err, { route: "POST /api/internal/log-breach" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
