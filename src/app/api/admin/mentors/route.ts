// src/app/api/admin/mentors/route.ts
import { ok, serverError, forbidden, getSession } from "@/lib/api-helpers";
import { prisma }                                 from "@/lib/prisma";
import { captureError }                           from "@/lib/sentry";
import { ApplicationStatus }                      from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
      return forbidden();
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page   = Math.max(1, parseInt(searchParams.get("page")   || "1",  10) || 1);
    const limit  = Math.max(1, Math.min(100, parseInt(searchParams.get("limit")  || "10", 10) || 10));

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { school: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.mentorApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.mentorApplication.count({ where }),
    ]);

    return ok({
      applications: items,
      total,
      page,
      limit,
      hasNextPage: skip + items.length < total,
    });
  } catch (err) {
    captureError(err, { route: "GET /api/admin/mentors" });
    return serverError();
  }
}
