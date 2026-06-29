// src/services/project.service.ts
import { projectRepository } from "@/repositories/project.repository";
import { writeAuditLog } from "@/lib/audit";
import type { CreateProjectInput, UpdateProjectInput } from "@/lib/validators/project";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export async function listProjects() {
  return projectRepository.listAll();
}

export async function getProject(id: string) {
  return projectRepository.findById(id);
}

export async function listProjectsByChapter(chapterId: string) {
  return projectRepository.listByChapter(chapterId);
}

export async function createProject(input: CreateProjectInput, ctx: ActorContext) {
  const project = await projectRepository.create(input);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "CREATE",
    model: "Project",
    recordId: project.id,
    after: { title: project.title, chapterId: project.chapterId },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, id: project.id, data: project };
}

export async function updateProject(id: string, input: UpdateProjectInput, ctx: ActorContext) {
  const existing = await projectRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Project not found." };

  const updated = await projectRepository.update(id, input);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "UPDATE",
    model: "Project",
    recordId: id,
    before: { title: existing.title, status: existing.status },
    after: { title: updated.title, status: updated.status },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, data: updated };
}

export async function deleteProject(id: string, ctx: ActorContext) {
  const existing = await projectRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Project not found." };

  await projectRepository.softDelete(id);

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "DELETE",
    model: "Project",
    recordId: id,
    before: { title: existing.title },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true };
}
