// src/lib/validators/contact.ts
import { z } from "zod";

export const ContactTypeEnum = z.enum([
  "SCHOOL_ENQUIRY",
  "PARTNERSHIP",
  "MEDIA",
  "GENERAL",
]);

export const MessageStatusEnum = z.enum(["UNREAD", "READ", "RESPONDED"]);

// POST /api/contact
export const contactSchema = z.object({
  name: z
    .string({ message: "Name is required." })
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be under 100 characters.")
    .trim(),

  email: z
    .string({ message: "Email is required." })
    .email("A valid email address is required.")
    .max(254, "Email is too long.")
    .trim()
    .toLowerCase(),

  type: ContactTypeEnum.default("GENERAL"),

  message: z
    .string({ message: "Message is required." })
    .min(10, "Message must be at least 10 characters.")
    .max(5000, "Message must be under 5000 characters.")
    .trim(),
});

export type ContactInput = z.infer<typeof contactSchema>;

// PATCH /api/admin/contacts/[id]
export const updateContactSchema = z.object({
  status: MessageStatusEnum.optional(),
  replyNote: z
    .string()
    .max(5000, "Reply note must be under 5000 characters.")
    .trim()
    .optional()
    .nullable(),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;