// src/services/accountability.service.ts
import { accountabilityRepository } from "@/repositories/accountability.repository";
import { userRepository } from "@/repositories/user.repository";
import { calculateStreak } from "./habit.service";
import { writeAuditLog } from "@/lib/audit";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export async function setAccountabilityPartner(userId: string, partnerId: string | null) {
  if (partnerId) {
    if (userId === partnerId) {
      return { success: false, error: "You cannot set yourself as your accountability partner." };
    }
    const partner = await userRepository.findById(partnerId);
    if (!partner) {
      return { success: false, error: "Partner user not found." };
    }
  }

  const updated = await accountabilityRepository.setPartner(userId, partnerId);
  return { success: true, data: updated };
}

export async function createAccountabilityGroup(userId: string, name: string, memberIds: string[]) {
  const uniqueMemberIds = Array.from(new Set([userId, ...memberIds]));

  for (const mId of uniqueMemberIds) {
    const u = await userRepository.findById(mId);
    if (!u) {
      return { success: false, error: `User with ID ${mId} not found.` };
    }
  }

  const group = await accountabilityRepository.createGroup(name, uniqueMemberIds);
  return { success: true, data: group };
}

export async function getPartnerAndGroupProgress(userId: string) {
  const partner = await accountabilityRepository.getPartnerWithHabits(userId);
  let partnerProgress = null;

  if (partner) {
    partnerProgress = {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      habits: partner.habits.map((h) => ({
        id: h.id,
        name: h.name,
        currentStreak: calculateStreak(h.logs),
      })),
    };
  }

  const groups = await accountabilityRepository.listGroupsForUser(userId);
  const groupsProgress = groups.map((g) => ({
    id: g.id,
    name: g.name,
    members: g.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      habits: m.user.habits.map((h) => ({
        id: h.id,
        name: h.name,
        currentStreak: calculateStreak(h.logs),
      })),
    })),
  }));

  return {
    partner: partnerProgress,
    groups: groupsProgress,
  };
}

export async function nudgeUser(
  userId: string,
  targetUserId: string,
  message: string | undefined,
  ctx: ActorContext
) {
  const target = await userRepository.findById(targetUserId);
  if (!target) {
    return { success: false, status: 404, error: "Target user not found." };
  }

  await writeAuditLog({
    actorId: ctx.actorId,
    actorEmail: ctx.actorEmail,
    action: "NUDGE_USER",
    model: "User",
    recordId: targetUserId,
    after: { message: message || "Hey! Just checking in on your habit streak." },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { success: true, message: `Nudge sent to ${target.name || target.email}.` };
}
