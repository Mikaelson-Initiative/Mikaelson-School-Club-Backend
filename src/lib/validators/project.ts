// src/lib/validators/project.ts
import { z } from "zod";

export const createProjectSchema = z.object({
  chapterId: z.string().uuid("Invalid chapter ID."),
  title: z
    .string({ message: "Title is required." })
    .min(3, "Title must be at least 3 characters.")
    .max(200, "Title must be under 200 characters.")
    .trim(),
  description: z
    .string({ message: "Description is required." })
    .min(10, "Description must be at least 10 characters.")
    .trim(),
  term: z
    .string({ message: "Term is required." })
    .min(3, "Term must be at least 3 characters.")
    .max(50)
    .trim(),
  status: z.enum(["PLANNING", "IN_PROGRESS", "COMPLETED"]).default("PLANNING"),
  memberIds: z.array(z.string().uuid()).default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
