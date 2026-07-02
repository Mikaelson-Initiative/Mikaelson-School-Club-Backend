// src/app/api/team/route.ts
// GET /api/team — Public

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        avatarUrl: true,
        bio: true,
        sortOrder: true,
        linkedinUrl: true,
        twitterUrl: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return ok(members);
  } catch (err) {
    captureError(err, { route: "GET /api/team" });
    return serverError();
  }
}