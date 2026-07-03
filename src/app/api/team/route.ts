// src/app/api/team/route.ts
// GET /api/team — Public

// Briefly cached at the edge for speed, but with a short window so admin edits
// (team members, order, etc.) appear within a minute rather than lingering.
export const revalidate = 30;

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
      headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    captureError(err, { route: "GET /api/team" });
    return serverError();
  }
}