// src/app/api/apply/student/route.ts
import { created, badRequest, serverError } from "@/lib/api-helpers";
import { studentApplySchema }               from "@/lib/validators/application";
import { prisma }                           from "@/lib/prisma";
import { sendStudentAlert, sendStudentConfirmation } from "@/lib/mailer";
import { captureError }                     from "@/lib/sentry";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON or empty body.");

    const parsed = studentApplySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const data = parsed.data;

    const duplicate = await prisma.studentApplication.findFirst({
      where: {
        name: data.name,
        school: data.school,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    if (duplicate) {
      return badRequest("An application from this name and school was already submitted recently. Please wait 30 days before reapplying.");
    }

    const application = await prisma.studentApplication.create({
      data: {
        name: data.name,
        email: data.email,
        school: data.school,
        year: data.year,
        city: data.city,
        goal: data.goal ?? null,
        status: "PENDING",
      }
    });

    Promise.allSettled([
      sendStudentConfirmation({
        to: data.email,
        name: data.name,
      }),
      sendStudentAlert({
        name: data.name,
        school: data.school,
        year: data.year,
        city: data.city,
        goal: data.goal ?? undefined,
        applicationId: application.id,
      })
    ]).then(results => {
      results.forEach(result => {
        if (result.status === 'rejected') {
          console.error("Failed to send student application alert", result.reason);
        }
      });
    });

    return created({ success: true, id: application.id });
  } catch (err) {
    captureError(err, { route: "POST /api/apply/student" });
    return serverError();
  }
}
