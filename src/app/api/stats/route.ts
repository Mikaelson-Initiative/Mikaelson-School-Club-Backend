// Briefly cached at the edge for speed, with a short window so admin changes
// (new chapters, student counts) appear within a minute.
export const revalidate = 30;
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
      headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" },
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
