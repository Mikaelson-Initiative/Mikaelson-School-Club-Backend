import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const launchedApps = await prisma.application.findMany({
      where: { status: "LAUNCHED" },
    });

    let fixedCount = 0;

    for (const app of launchedApps) {
      // Check if a chapter already exists with this name to avoid duplicates
      const existingChapter = await prisma.schoolChapter.findFirst({
        where: { name: app.schoolName },
      });

      if (!existingChapter) {
        await prisma.$transaction(async (tx) => {
          await tx.schoolChapter.create({
            data: {
              name: app.schoolName,
              city: app.location,
              country: "Unknown",
              coordinatorName: app.contactName,
              coordinatorEmail: app.email,
              coordinatorPhone: app.phone,
              studentsCount: app.studentsEstimate,
              status: "REGISTERED",
            },
          });

          await tx.platformStat.upsert({
            where: { id: "global" },
            update: {
              totalSchools: { increment: 1 },
              activeChapters: { increment: 1 },
              totalStudents: { increment: app.studentsEstimate },
            },
            create: {
              id: "global",
              totalSchools: 10,
              activeChapters: 13,
              totalStudents: 480 + app.studentsEstimate,
              retentionRate: 94,
            },
          });
        });
        fixedCount++;
      }
    }

    return NextResponse.json({ success: true, fixedCount, totalLaunchedApps: launchedApps.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
