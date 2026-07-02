// src/app/api/team/route.ts
// GET /api/team — Public

// Cached at the edge: served instantly and revalidated in the background so
// visitors don't wait on a cold function/database.
export const revalidate = 120;

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
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=86400" },
    });
  } catch (err) {
    captureError(err, { route: "GET /api/team" });
    return serverError();
  }
}