// Business logic for volunteer applications.
// Orchestrates: repository → email → audit log.
// No HTTP concerns here — no Request, no Response.
// ─────────────────────────────────────────────────────────────────────────────

import { volunteerRepository } from "@/repositories/volunteer.repository";
import { writeAuditLog } from "@/lib/audit";
import { sendVolunteerConfirmation, sendVolunteerAlert, sendVolunteerStatusUpdateEmail } from "@/lib/mailer";
import { captureError } from "@/lib/sentry";
import type { ApplyVolunteerInput, UpdateVolunteerInput } from "@/lib/validators/volunteer";
import type { ApplicationStatus } from "@prisma/client";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export type SubmitResult =
  | { success: true;  id: string }
  | { success: false; error: string; status: number };

export async function submitVolunteerApplication(
  input: ApplyVolunteerInput,
  ctx:   ActorContext
): Promise<SubmitResult> {
  // Duplicate guard — same email within 30 days
  const duplicate = await volunteerRepository.findRecentDuplicate(input.email);

  if (duplicate) {
    return {
      success: false,
      status:  400,
      error:   "A volunteer application from this email was already submitted recently. Please wait 30 days before reapplying.",
    };
  }

  const application = await volunteerRepository.create({
    name:       input.name,
    email:      input.email,
    phone:      input.phone ?? null,
    role:       input.role,
    org:        input.org ?? null,
    location:   input.location ?? null,
    motivation: input.motivation ?? null,
  });

  // Audit — async, non-blocking
  await writeAuditLog({
    action:    "CREATE",
    model:     "VolunteerApplication",
    recordId:  application.id,
    after:     { name: input.name, email: input.email, status: "PENDING" },
    ip:        ctx.ip,
    userAgent: ctx.userAgent,
  });

  // Emails — fire-and-forget, never fail the request
  await Promise.allSettled([
    sendVolunteerConfirmation({
      to:   input.email,
      name: input.name,
    }),
    sendVolunteerAlert({
      name:          input.name,
      email:         input.email,
      phone:         input.phone ?? undefined,
      role:          input.role,
      org:           input.org ?? undefined,
      location:      input.location ?? undefined,
      motivation:    input.motivation ?? undefined,
      applicationId: application.id,
    }),
  ]);

  return { success: true, id: application.id };
}

export async function listVolunteers(options: {
  status?: string;
  search?: string;
  page:    number;
  limit:   number;
}) {
  const { items, total } = await volunteerRepository.list({
    status: options.status as ApplicationStatus | undefined,
    search: options.search,
    page:   options.page,
    limit:  options.limit,
  });

  return {
    volunteers:  items,
    total,
    page:        options.page,
    limit:       options.limit,
    hasNextPage: (options.page - 1) * options.limit + items.length < total,
  };
}

export type UpdateResult =
  | { success: true;  data: Awaited<ReturnType<typeof volunteerRepository.update>> }
  | { success: false; error: string; status: number };

export async function updateVolunteer(
  id:    string,
  input: UpdateVolunteerInput,
  ctx:   ActorContext
): Promise<UpdateResult> {
  const existing = await volunteerRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Volunteer application not found." };

  const updated = await volunteerRepository.update(id, {
    ...(input.status ? { status: input.status } : {}),
  });

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "UPDATE",
    model:      "VolunteerApplication",
    recordId:   id,
    before:     { status: existing.status },
    after:      { status: updated.status  },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  // Notify volunteer on meaningful status milestones
  if (input.status) {
    sendVolunteerStatusUpdateEmail({
      to:        existing.email,
      name:      existing.name,
      newStatus: input.status,
    }).catch((e) => captureError(e, { route: "sendVolunteerStatusUpdateEmail" }));
  }

  return { success: true, data: updated };
}

export async function deleteVolunteer(
  id: string,
  ctx: ActorContext
): Promise<
  | { success: true }
  | { success: false; error: string; status: number }
> {
  const existing = await volunteerRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Volunteer application not found." };

  await volunteerRepository.softDelete(id);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "DELETE",
    model:      "VolunteerApplication",
    recordId:   id,
    before:     { status: existing.status, name: existing.name },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true };
}
