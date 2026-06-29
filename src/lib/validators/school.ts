// src/lib/validators/school.ts
import { z } from "zod";

export const ChapterStatusEnum = z.enum([
  "REGISTERED",
  "ONBOARDING",
  "ACTIVE",
  "INACTIVE",
]);

// POST /api/admin/schools
export const createSchoolSchema = z.object({
  name: z
    .string({ message: "Chapter name is required." })
    .min(2, "Chapter name must be at least 2 characters.")
    .max(200, "Chapter name must be under 200 characters.")
    .trim(),

  city: z
    .string({ message: "City is required." })
    .min(2, "City must be at least 2 characters.")
    .max(100, "City must be under 100 characters.")
    .trim(),

  country: z
    .string({ message: "Country is required." })
    .min(2, "Country must be at least 2 characters.")
    .max(100, "Country must be under 100 characters.")
    .trim(),

  status: ChapterStatusEnum.default("REGISTERED"),

  // z.coerce handles admin forms that submit this as a string
  studentsCount: z.coerce
    .number()
    .int()
    .min(0, "Students count cannot be negative.")
    .max(100000)
    .default(0),

  coordinatorName: z
    .string()
    .max(100)
    .trim()
    .optional()
    .nullable(),

  coordinatorEmail: z
    .string()
    .email("Coordinator email must be a valid email.")
    .max(254)
    .trim()
    .toLowerCase()
    .optional()
    .nullable(),

  coordinatorPhone: z
    .string()
    .regex(/^\+?[\d\s\-().]{7,20}$/, "Coordinator phone format is invalid.")
    .optional()
    .nullable(),

  notes: z
    .string()
    .max(5000)
    .trim()
    .optional()
    .nullable(),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

// PATCH /api/admin/schools/[id] — all fields optional
export const updateSchoolSchema = createSchoolSchema.partial();

export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;