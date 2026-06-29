// src/lib/validators/accountability.ts
import { z } from "zod";

export const setPartnerSchema = z.object({
  partnerId: z.string().uuid("Invalid partner user ID.").nullable(),
});

export type SetPartnerInput = z.infer<typeof setPartnerSchema>;

export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required.").max(100).trim(),
  memberIds: z.array(z.string().uuid("Invalid member user ID.")).min(1, "Must select at least one member."),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const nudgeSchema = z.object({
  targetUserId: z.string().uuid("Invalid target user ID."),
  message: z.string().max(200).trim().optional(),
});

export type NudgeInput = z.infer<typeof nudgeSchema>;
