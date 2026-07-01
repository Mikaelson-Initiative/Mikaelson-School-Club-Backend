import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let stats = await prisma.platformStat.findUnique({
      where: { id: "global" },
    });

    if (!stats) {
      // Create with initial data if it doesn't exist
      stats = await prisma.platformStat.create({
        data: {
          id: "global",
          totalSchools: 9,
          activeChapters: 12,
          totalStudents: 480,
          retentionRate: 94,
        },
      });
    }

    return NextResponse.json({
      totalSchools: stats.totalSchools,
      activeChapters: stats.activeChapters,
      totalStudents: stats.totalStudents,
      retentionRate: stats.retentionRate,
    });
  } catch (error) {
    console.error("Failed to fetch platform stats:", error);
    // Return safe fallback instead of erroring the homepage
    return NextResponse.json({
      totalSchools: 9,
      activeChapters: 12,
      totalStudents: 480,
      retentionRate: 94,
    });
  }
}
