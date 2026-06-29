// src/services/lesson.service.ts
import { lessonRepository } from "@/repositories/lesson.repository";
import { writeAuditLog } from "@/lib/audit";
import type { CreateLessonInput, UpdateLessonInput } from "@/lib/validators/lesson";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export async function listLessons() {
  return lessonRepository.listAll();
}

export async function getLesson(id: string) {
  return lessonRepository.findById(id);
}

export async function createLesson(input: CreateLessonInput, ctx: ActorContext) {
  const lesson = await lessonRepository.create(input);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "CREATE",
    model: "Lesson",
    recordId: lesson.id,
    after: { title: lesson.title, category: lesson.category },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, id: lesson.id, data: lesson };
}

export async function updateLesson(id: string, input: UpdateLessonInput, ctx: ActorContext) {
  const existing = await lessonRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Lesson not found." };

  const updated = await lessonRepository.update(id, input);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "UPDATE",
    model: "Lesson",
    recordId: id,
    before: { title: existing.title, category: existing.category },
    after: { title: updated.title, category: updated.category },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, data: updated };
}

export async function deleteLesson(id: string, ctx: ActorContext) {
  const existing = await lessonRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Lesson not found." };

  await lessonRepository.softDelete(id);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "DELETE",
    model: "Lesson",
    recordId: id,
    before: { title: existing.title },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true };
}
