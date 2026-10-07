// src/app/api/team/route.ts
// GET /api/team — Public

// Always fresh so admin edits (members, photos, order) show immediately.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        bio: true,
        sortOrder: true,
        linkedinUrl: true,
        twitterUrl: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(members, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    captureError(err, { route: "GET /api/team" });
    return serverError();
  }
}