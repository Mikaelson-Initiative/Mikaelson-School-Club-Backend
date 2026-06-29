// src/lib/validators/application.ts
import { z } from "zod";

export const ApplicationStatusEnum = z.enum([
  "PENDING",
  "REVIEWED",
  "SCHEDULED",
  "TRAINING",
  "LAUNCHED",
  "REJECTED",
]);

export const ApplicationRoleEnum = z.enum([
  "Principal",
  "Deputy Principal",
  "Head of Student Affairs",
  "Teacher",
  "Student",
  "Other",
]);

// POST /api/apply — public submission
export const applySchema = z.object({
  schoolName: z
    .string({ message: "School name is required." })
    .min(2, "School name must be at least 2 characters.")
    .max(200, "School name must be under 200 characters.")
    .trim(),

  contactName: z
    .string({ message: "Contact name is required." })
    .min(2, "Contact name must be at least 2 characters.")
    .max(100, "Contact name must be under 100 characters.")
    .trim(),

  role: ApplicationRoleEnum,

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

  location: z
    .string({ message: "Location (city & country) is required." })
    .min(2, "Location must be at least 2 characters.")
    .max(200, "Location must be under 200 characters.")
    .trim(),

  studentsEstimate: z.coerce
    .number({ message: "Students estimate must be a number." })
    .int("Students estimate must be a whole number.")
    .min(0, "Students estimate cannot be negative.")
    .max(10000, "Students estimate seems unrealistically high.")
    .default(0),

  message: z
    .string()
    .max(2000, "Message must be under 2000 characters.")
    .trim()
    .optional()
    .nullable(),
});

export type ApplyInput = z.infer<typeof applySchema>;

// PATCH /api/admin/applications/[id] — only accepts the five post-PENDING statuses from spec
export const updateApplicationSchema = z.object({
  status: z.enum([
    "REVIEWED",
    "SCHEDULED",
    "TRAINING",
    "LAUNCHED",
    "REJECTED",
  ]).optional(),
  adminNotes: z
    .string()
    .max(5000, "Admin notes must be under 5000 characters.")
    .trim()
    .optional()
    .nullable(),
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;