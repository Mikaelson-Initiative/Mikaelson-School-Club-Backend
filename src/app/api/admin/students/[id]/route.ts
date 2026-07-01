// src/app/api/admin/students/[id]/route.ts
import { ok, badRequest, notFound, serverError, forbidden, getSession } from "@/lib/api-helpers";
import { prisma }                                           from "@/lib/prisma";
import { updateApplicationSchema }                          from "@/lib/validators/application";
import { writeAuditLog }                                    from "@/lib/audit";
import { captureError }                                     from "@/lib/sentry";
import { ApplicationStatus }                                from "@prisma/client";
import { sendStudentConfirmation }                          from "@/lib/mailer"; // For status updates if email existed

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
      return forbidden();
    }

    const resolvedParams = await params;
    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON.");

    const parsed = updateApplicationSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");

    const existing = await prisma.studentApplication.findUnique({
      where: { id: resolvedParams.id },
    });
    if (!existing) return notFound("Student application not found.");

    const updated = await prisma.studentApplication.update({
      where: { id: resolvedParams.id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status as ApplicationStatus } : {}),
      },
    });

    await writeAuditLog({
      actorId:    session.user.id,
      actorEmail: session.user.email,
      action:     "UPDATE",
      model:      "StudentApplication",
      recordId:   resolvedParams.id,
      before:     { status: existing.status },
      after:      { status: updated.status },
    });

    return ok({ success: true, application: updated });
  } catch (err) {
    captureError(err, { route: "PATCH /api/admin/students/[id]" });
    return serverError();
  }
}
