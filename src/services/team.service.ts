import { teamRepository }                                  from "@/repositories/team.repository";
import { writeAuditLog }                                   from "@/lib/audit";
import { Prisma }                                          from "@/lib/prisma";
import type { CreateTeamMemberInput, UpdateTeamMemberInput } from "@/lib/validators/team";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export async function getPublicTeam() {
  return teamRepository.listPublic();
}

export async function listAdminTeam() {
  return teamRepository.listAdmin();
}

export async function createTeamMember(
  input: CreateTeamMemberInput,
  ctx:   ActorContext
): Promise<
  | { success: true; id: string }
  | { success: false; status: number; error: string }
> {
  try {
    const member = await teamRepository.create(input);

    await writeAuditLog({
      actorId:    ctx.actorId,
      actorEmail: ctx.actorEmail,
      action:     "CREATE",
      model:      "TeamMember",
      recordId:   member.id,
      after:      { name: member.name, role: member.role, email: member.email },
      ip:         ctx.ip,
      userAgent:  ctx.userAgent,
    });

    return { success: true, id: member.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false, status: 400, error: "A team member with this email already exists." };
    }
    throw err;
  }
}

export async function updateTeamMember(
  id:    string,
  input: UpdateTeamMemberInput,
  ctx:   ActorContext
): Promise<
  | { success: true; data: Awaited<ReturnType<typeof teamRepository.update>> }
  | { success: false; status: number; error: string }
> {
  const existing = await teamRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Team member not found." };

  const updated = await teamRepository.update(id, input);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "UPDATE",
    model:      "TeamMember",
    recordId:   id,
    before:     { name: existing.name, role: existing.role },
    after:      { name: updated.name,  role: updated.role  },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true, data: updated };
}

export async function deleteTeamMember(
  id: string,
  ctx: ActorContext
): Promise<
  | { success: true }
  | { success: false; status: number; error: string }
> {
  const existing = await teamRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Team member not found." };

  await teamRepository.softDelete(id);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "DELETE",
    model:      "TeamMember",
    recordId:   id,
    before:     { name: existing.name, email: existing.email },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true };
}