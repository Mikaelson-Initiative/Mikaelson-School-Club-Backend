// Business logic for school applications.
// Orchestrates: repository → email → audit log.
// No HTTP concerns here — no Request, no Response.
// ─────────────────────────────────────────────────────────────────────────────

import { applicationRepository }                      from "@/repositories/application.repository";
import { writeAuditLog }                              from "@/lib/audit";
import { sendApplicationConfirmation, sendApplicationAlert, sendStatusUpdateEmail } from "@/lib/mailer";
import { captureError }                               from "@/lib/sentry";
import type { ApplyInput, UpdateApplicationInput }    from "@/lib/validators/application";
import type { ApplicationStatus }                     from "@prisma/client";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

// ── Submit a new application ──────────────────────────────────────────────────

export type SubmitResult =
  | { success: true;  id: string }
  | { success: false; error: string; status: number };

export async function submitApplication(
  input: ApplyInput,
  ctx:   ActorContext
): Promise<SubmitResult> {
  // Duplicate guard — same email + school within 30 days
  const duplicate = await applicationRepository.findRecentDuplicate(
    input.email,
    input.schoolName
  );

  if (duplicate) {
    return {
      success: false,
      status:  400,
      error:   "An application from this email and school was already submitted recently. Please wait 30 days before reapplying.",
    };
  }

  const application = await applicationRepository.create({
    schoolName:       input.schoolName,
    contactName:      input.contactName,
    role:             input.role,
    email:            input.email,
    phone:            input.phone ?? null,
    location:         input.location,
    studentsEstimate: input.studentsEstimate,
    message:          input.message ?? null,
  });

  // Audit — async, non-blocking
  await writeAuditLog({
    action:    "CREATE",
    model:     "Application",
    recordId:  application.id,
    after:     { schoolName: input.schoolName, email: input.email, status: "PENDING" },
    ip:        ctx.ip,
    userAgent: ctx.userAgent,
  });

  // Emails — fire-and-forget, never fail the request
  const emailResults = await Promise.allSettled([
    sendApplicationConfirmation({
      to:          input.email,
      contactName: input.contactName,
      schoolName:  input.schoolName,
    }),
    sendApplicationAlert({
      schoolName:       input.schoolName,
      contactName:      input.contactName,
      role:             input.role,
      email:            input.email,
      phone:            input.phone ?? undefined,
      location:         input.location,
      studentsEstimate: input.studentsEstimate,
      message:          input.message ?? undefined,
      applicationId:    application.id,
    }),
  ]);

  emailResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[DEBUG EMAIL] Failed to send email ${index}:`, result.reason);
    } else if (result.value && result.value.error) {
      console.error(`[DEBUG EMAIL] Resend API error for email ${index}:`, result.value.error);
    } else {
      console.log(`[DEBUG EMAIL] Successfully sent email ${index}:`, result.value?.data);
    }
  });

  return { success: true, id: application.id };
}

// ── List applications (admin) ─────────────────────────────────────────────────

export async function listApplications(options: {
  status?: string;
  search?: string;
  page:    number;
  limit:   number;
}) {
  const { items, total } = await applicationRepository.list({
    status: options.status as ApplicationStatus | undefined,
    search: options.search,
    page:   options.page,
    limit:  options.limit,
  });

  return {
    applications: items,
    total,
    page:         options.page,
    limit:        options.limit,
    hasNextPage:  (options.page - 1) * options.limit + items.length < total,
  };
}

// ── Update application status ─────────────────────────────────────────────────

export type UpdateResult =
  | { success: true;  data: Awaited<ReturnType<typeof applicationRepository.update>> }
  | { success: false; error: string; status: number };

export async function updateApplication(
  id:    string,
  input: UpdateApplicationInput,
  ctx:   ActorContext
): Promise<UpdateResult> {
  const existing = await applicationRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Application not found." };

  const updated = await applicationRepository.update(id, {
    ...(input.status     ? { status: input.status }         : {}),
    ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes } : {}),
  });

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "UPDATE",
    model:      "Application",
    recordId:   id,
    before:     { status: existing.status, adminNotes: existing.adminNotes },
    after:      { status: updated.status,  adminNotes: updated.adminNotes  },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  // Notify applicant on meaningful status milestones
  if (input.status) {
    sendStatusUpdateEmail({
      to:          existing.email,
      contactName: existing.contactName,
      schoolName:  existing.schoolName,
      newStatus:   input.status,
    }).catch((e) => captureError(e, { route: "sendStatusUpdateEmail" }));
  }

  return { success: true, data: updated };
}

// ── Soft-delete application ───────────────────────────────────────────────────

export async function deleteApplication(
  id: string,
  ctx: ActorContext
): Promise<
  | { success: true }
  | { success: false; error: string; status: number }
> {
  const existing = await applicationRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Application not found." };

  await applicationRepository.softDelete(id);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "DELETE",
    model:      "Application",
    recordId:   id,
    before:     { status: existing.status, schoolName: existing.schoolName },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true };
}