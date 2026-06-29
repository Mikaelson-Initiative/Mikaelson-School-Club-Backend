// src/app/api/schools/route.ts
// GET /api/schools — Public list of school chapters

export const dynamic = "force-dynamic";

import { schoolRepository } from "@/repositories/school.repository";
import { ok, serverError } from "@/lib/api-helpers";
import { captureError } from "@/lib/sentry";

export async function GET() {
  try {
    const chapters = await schoolRepository.listPublic();
    const result = chapters.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      country: c.country,
      status: c.status,
      studentsCount: c.studentsCount,
      registrationDate: c.createdAt,
    }));
    return ok(result);
  } catch (err) {
    captureError(err, { route: "GET /api/schools" });
    return serverError();
  }
}
