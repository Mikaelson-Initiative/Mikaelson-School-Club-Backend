// src/lib/validators/lesson.ts
import { z } from "zod";

export const createLessonSchema = z.object({
  title: z
    .string({ message: "Title is required." })
    .min(3, "Title must be at least 3 characters.")
    .max(200, "Title must be under 200 characters.")
    .trim(),

  content: z
    .string({ message: "Content is required." })
    .min(10, "Content must be at least 10 characters.")
    .trim(),

  category: z
    .string({ message: "Category is required." })
    .min(2, "Category must be at least 2 characters.")
    .max(50)
    .trim(),

  estimatedMinutes: z
    .number()
    .int()
    .nonnegative()
    .default(0),

  skillTags: z
    .array(z.string().trim())
    .default([]),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = createLessonSchema.partial();
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
