// src/lib/validators/habit.ts
import { z } from "zod";

export const createHabitSchema = z.object({
  name: z.string().min(1, "Habit name is required.").max(100).trim(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;

export const logHabitSchema = z.object({
  loggedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Must be a valid date string.",
  }).optional(),
});

export type LogHabitInput = z.infer<typeof logHabitSchema>;
