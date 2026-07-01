import { eventRepository }                             from "@/repositories/event.repository";
import { writeAuditLog }                               from "@/lib/audit";
import { prisma }                                      from "@/lib/prisma";
import type { CreateEventInput, UpdateEventInput }     from "@/lib/validators/event";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export async function getPublicEvents(options: { from?: string; to?: string }) {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (options.from) dateFilter.gte = new Date(options.from);
  if (options.to)   dateFilter.lte = new Date(options.to);

  return eventRepository.listPublic(
    Object.keys(dateFilter).length ? dateFilter : undefined
  );
}

export async function listAdminEvents() {
  return eventRepository.listAll();
}

export async function createEvent(input: CreateEventInput, ctx: ActorContext): Promise<{ success: true; id: string }> {
  const event = await eventRepository.create({
    ...input,
    date: new Date(input.date),
    time: input.time ?? "",
    location: input.location ?? "",
    description: input.description ?? "",
    category: input.category ?? "Other",
  });

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "CREATE",
    model:      "Event",
    recordId:   event.id,
    after:      { title: event.title, date: event.date },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true, id: event.id };
}

export async function updateEvent(
  id: string,
  input: UpdateEventInput,
  ctx: ActorContext
): Promise<
  | { success: true; data: Awaited<ReturnType<typeof eventRepository.update>> }
  | { success: false; status: number; error: string }
> {
  const existing = await eventRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Event not found." };

  const { date, ...rest } = input;
  const updated = await eventRepository.update(id, {
    ...rest,
    ...(date ? { date: new Date(date) } : {}),
  });

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "UPDATE",
    model:      "Event",
    recordId:   id,
    before:     { title: existing.title, isPast: existing.isPast },
    after:      { title: updated.title,  isPast: updated.isPast  },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true, data: updated };
}

export async function deleteEvent(
  id: string,
  ctx: ActorContext
): Promise<
  | { success: true }
  | { success: false; status: number; error: string }
> {
  const existing = await eventRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Event not found." };

  await eventRepository.softDelete(id);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "DELETE",
    model:      "Event",
    recordId:   id,
    before:     { title: existing.title },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true };
}

export async function markMeetingAttendance(
  mentorUserId: string,
  eventId: string,
  studentUserId: string,
  attended: boolean,
  ctx: ActorContext
) {
  const mentor = await prisma.user.findFirst({ where: { id: mentorUserId } });
  if (!mentor) return { success: false, status: 404, error: "Mentor not found." };

  const event = await eventRepository.findById(eventId);
  if (!event) return { success: false, status: 404, error: "Event not found." };

  const student = await prisma.user.findFirst({ where: { id: studentUserId } });
  if (!student) return { success: false, status: 404, error: "Student not found." };

  const isHostAdmin = mentor.role === "ADMIN" || mentor.role === "SUPERADMIN";
  if (!isHostAdmin && mentor.role !== "MENTOR") {
    return { success: false, status: 403, error: "Only mentors can mark attendance." };
  }

  if (!isHostAdmin) {
    if (mentor.chapterId !== event.chapterId) {
      return { success: false, status: 403, error: "You can only mark attendance for events in your own chapter." };
    }
    if (mentor.chapterId !== student.chapterId) {
      return { success: false, status: 403, error: "You can only mark attendance for students in your own chapter." };
    }
  }

  const attendance = await eventRepository.upsertAttendance(eventId, studentUserId, attended);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "MARK_ATTENDANCE",
    model: "MeetingAttendance",
    recordId: attendance.id,
    after: { eventId, studentUserId, attended },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, data: attendance };
}

export async function getUpcomingChapterMeetings(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user || !user.chapterId) {
    return { success: true, data: [] };
  }

  const meetings = await eventRepository.listUpcomingMeetings(user.chapterId);
  return { success: true, data: meetings };
}