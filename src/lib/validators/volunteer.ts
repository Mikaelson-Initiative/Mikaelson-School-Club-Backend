import { z } from "zod";

export const VolunteerStatusEnum = z.enum([
  "PENDING",
  "REVIEWED",
  "SCHEDULED",
  "TRAINING",
  "LAUNCHED",
  "REJECTED",
]);

export const VolunteerRoleEnum = z.enum([
  "Teacher",
  "Senior Student/Prefect",
  "Community Leader",
  "Other",
]);

// POST /api/volunteer — public submission
export const applyVolunteerSchema = z.object({
  name: z
    .string({ message: "Name is required." })
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be under 100 characters.")
    .trim(),

  email: z
    .string({ message: "Email is required." })
    .email("Invalid email address.")
    .max(254, "Email is too long.")
    .trim()
    .toLowerCase(),

  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-().]{7,20}$/.test(val), {
      message: "Invalid phone number format.",
    })
    .nullable(),

  role: z
    .string({ message: "Role is required." })
    .trim(),

  org: z
    .string()
    .max(200, "Organisation name must be under 200 characters.")
    .trim()
    .optional()
    .nullable(),

  location: z
    .string()
    .max(200, "Location must be under 200 characters.")
    .trim()
    .optional()
    .nullable(),

  motivation: z
    .string()
    .max(2000, "Motivation must be under 2000 characters.")
    .trim()
    .optional()
    .nullable(),
});

export type ApplyVolunteerInput = z.infer<typeof applyVolunteerSchema>;

// PATCH /api/admin/volunteers/[id] — only accepts the five post-PENDING statuses from spec
export const updateVolunteerSchema = z.object({
  status: z.enum([
    "REVIEWED",
    "SCHEDULED",
    "TRAINING",
    "LAUNCHED",
    "REJECTED",
  ]).optional(),
});

export type UpdateVolunteerInput = z.infer<typeof updateVolunteerSchema>;
