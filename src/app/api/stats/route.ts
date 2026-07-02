// Cached at the edge and revalidated in the background so the homepage stats
// render instantly instead of waiting on a cold function/database.
export const revalidate = 120;
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [stats, totalSchools, activeChapters, studentsAgg] = await Promise.all([
      prisma.platformStat.findUnique({ where: { id: "global" } }),
      prisma.schoolChapter.count(),
      prisma.schoolChapter.count({ where: { status: { not: "INACTIVE" } } }),
      prisma.schoolChapter.aggregate({ _sum: { studentsCount: true } })
    ]);

    const retentionRate = stats?.retentionRate ?? 94;

    return NextResponse.json({
      totalSchools: totalSchools,
      activeChapters: activeChapters,
      totalStudents: studentsAgg._sum.studentsCount || 0,
      retentionRate,
    }, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("Failed to fetch platform stats:", error);
    return NextResponse.json({
      totalSchools: 0,
      activeChapters: 0,
      totalStudents: 0,
      retentionRate: 0,
    });
  }
}
