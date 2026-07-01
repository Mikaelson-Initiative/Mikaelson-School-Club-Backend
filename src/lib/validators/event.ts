// src/lib/validators/event.ts
import { z } from "zod";

// POST /api/admin/events
export const createEventSchema = z.object({
  title: z
    .string({ message: "Title is required." })
    .min(3, "Title must be at least 3 characters.")
    .max(200, "Title must be under 200 characters.")
    .trim(),

  date: z
    .string({ message: "Date is required." })
    .refine((d) => !isNaN(Date.parse(d)), "Date must be a valid ISO date string."),

  time: z
    .string({ message: "Time is required." })
    .max(50, "Time must be under 50 characters.")
    .trim()
    .optional()
    .or(z.literal("")),

  location: z
    .string({ message: "Location is required." })
    .max(300, "Location must be under 300 characters.")
    .trim()
    .optional()
    .or(z.literal("")),

  description: z
    .string({ message: "Description is required." })
    .max(10000, "Description must be under 10000 characters.")
    .trim()
    .optional()
    .or(z.literal("")),

  category: z
    .string()
    .max(50, "Category must be under 50 characters.")
    .trim()
    .optional(),

  isPast: z.boolean().default(false),

  attendees: z
    .string()
    .max(100, "Attendees field must be under 100 characters.")
    .trim()
    .optional()
    .nullable(),

  registrationUrl: z
    .string()
    .url("Registration URL must be a valid URL.")
    .max(500)
    .optional()
    .nullable(),

  chapterId: z
    .string()
    .uuid("Invalid chapter ID.")
    .optional()
    .nullable(),

  recurrenceRule: z
    .string()
    .max(100)
    .optional()
    .nullable(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// POST /api/admin/events/[id]/attendance
export const markAttendanceSchema = z.object({
  userId: z.string().uuid("Invalid user ID."),
  attended: z.boolean(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;