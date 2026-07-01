// src/app/api/apply/mentor/route.ts
import { created, badRequest, serverError } from "@/lib/api-helpers";
import { mentorApplySchema }                from "@/lib/validators/application";
import { prisma }                           from "@/lib/prisma";
import { sendMentorConfirmation, sendMentorAlert } from "@/lib/mailer";
import { captureError }                     from "@/lib/sentry";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON or empty body.");

    const parsed = mentorApplySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const data = parsed.data;

    const duplicate = await prisma.mentorApplication.findFirst({
      where: {
        email: data.email,
        school: data.school,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    if (duplicate) {
      return badRequest("An application from this email and school was already submitted recently. Please wait 30 days before reapplying.");
    }

    const application = await prisma.mentorApplication.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        school: data.school,
        city: data.city,
        experience: data.experience ?? null,
        status: "PENDING",
      }
    });

    Promise.allSettled([
      sendMentorConfirmation({
        to: data.email,
        name: data.name,
      }),
      sendMentorAlert({
        name: data.name,
        email: data.email,
        role: data.role,
        school: data.school,
        city: data.city,
        experience: data.experience ?? undefined,
        applicationId: application.id,
      })
    ]).then(results => {
      results.forEach(result => {
        if (result.status === 'rejected') {
          console.error("Failed to send mentor application email", result.reason);
        }
      });
    });

    return created({ success: true, id: application.id });
  } catch (err) {
    captureError(err, { route: "POST /api/apply/mentor" });
    return serverError();
  }
}
