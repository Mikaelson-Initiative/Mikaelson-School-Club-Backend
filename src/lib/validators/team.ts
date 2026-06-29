// src/lib/validators/team.ts
import { z } from "zod";

// POST /api/admin/team
export const createTeamMemberSchema = z.object({
  name: z
    .string({ message: "Name is required." })
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be under 100 characters.")
    .trim(),

  role: z
    .string({ message: "Role is required." })
    .min(2, "Role must be at least 2 characters.")
    .max(100, "Role must be under 100 characters.")
    .trim(),

  email: z
    .string({ message: "Email is required." })
    .email("A valid email address is required.")
    .max(254, "Email is too long.")
    .trim()
    .toLowerCase(),

  avatarUrl: z
    .string()
    .url("Avatar URL must be a valid URL.")
    .max(1000)
    .optional()
    .nullable(),

  bio: z
    .string()
    .max(2000, "Bio must be under 2000 characters.")
    .trim()
    .optional()
    .nullable(),

  // z.coerce handles admin forms that submit this as a string
  sortOrder: z.coerce
    .number()
    .int()
    .min(0)
    .max(9999)
    .default(0),

  linkedinUrl: z
    .string()
    .url("LinkedIn URL must be a valid URL.")
    .max(500)
    .optional()
    .nullable(),

  twitterUrl: z
    .string()
    .url("Twitter URL must be a valid URL.")
    .max(500)
    .optional()
    .nullable(),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

// PATCH — all fields optional
export const updateTeamMemberSchema = createTeamMemberSchema.partial();
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;