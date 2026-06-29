import { schoolRepository } from "@/repositories/school.repository";
import { writeAuditLog } from "@/lib/audit";
import type { CreateSchoolInput, UpdateSchoolInput } from "@/lib/validators/school";
import type { ChapterStatus } from "@prisma/client";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export async function listAdminSchools(options: { status?: string; country?: string }) {
  return schoolRepository.listAdmin({
    status: options.status as ChapterStatus | undefined,
    country: options.country,
  });
}

export async function createSchool(
  input: CreateSchoolInput,
  ctx:   ActorContext
): Promise<
  | { success: true; id: string }
  | { success: false; error: string }
> {
  const existing = await schoolRepository.findByName(input.name);
  if (existing) {
    return { success: false, error: "A school chapter with this name already exists." };
  }

  const school = await schoolRepository.create(input);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "CREATE",
    model:      "SchoolChapter",
    recordId:   school.id,
    after:      { name: school.name, status: school.status },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true, id: school.id };
}

export async function updateSchool(
  id:    string,
  input: UpdateSchoolInput,
  ctx:   ActorContext
): Promise<
  | { success: true; data: Awaited<ReturnType<typeof schoolRepository.update>> }
  | { success: false; status: number; error: string }
> {
  const existing = await schoolRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "School not found." };

  const updated = await schoolRepository.update(id, input);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "UPDATE",
    model:      "SchoolChapter",
    recordId:   id,
    before:     { name: existing.name, status: existing.status },
    after:      { name: updated.name, status: updated.status },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true, data: updated };
}

export async function deleteSchool(
  id:  string,
  ctx: ActorContext
): Promise<
  | { success: true }
  | { success: false; error: string; status: number }
> {
  const existing = await schoolRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "School not found." };

  await schoolRepository.softDelete(id);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "DELETE",
    model:      "SchoolChapter",
    recordId:   id,
    before:     { name: existing.name, status: existing.status },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true };
}

export async function getChapterRoster(schoolId: string) {
  const existing = await schoolRepository.findById(schoolId);
  if (!existing) return { success: false, status: 404, error: "School chapter not found." };
  const roster = await schoolRepository.getRoster(schoolId);
  return { success: true, data: roster };
}

export async function setChapterOfMonth(schoolId: string, ctx: ActorContext) {
  const existing = await schoolRepository.findById(schoolId);
  if (!existing) return { success: false, status: 404, error: "School chapter not found." };

  await schoolRepository.setFeatured(schoolId);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "FEATURE_CHAPTER",
    model: "SchoolChapter",
    recordId: schoolId,
    after: { isChapterOfMonth: true },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true };
}

export async function getFeaturedChapter() {
  return schoolRepository.findFeatured();
}
