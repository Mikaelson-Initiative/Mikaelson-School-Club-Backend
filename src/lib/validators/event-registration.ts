import { z } from "zod";

export const eventRegistrationSchema = z.object({
  name: z
    .string({ message: "Name is required." })
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be under 100 characters.")
    .trim(),

  email: z
    .string({ message: "Email is required." })
    .email("Must be a valid email address.")
    .trim(),

  schoolName: z
    .string()
    .max(150, "School name must be under 150 characters.")
    .trim()
    .optional()
    .or(z.literal("")),
});

export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;
