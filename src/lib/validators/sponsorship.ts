// src/lib/validators/sponsorship.ts
import { z } from "zod";

export const SponsorshipTypeEnum = z.enum(["STUDENT", "CHAPTER"]);

// POST /api/sponsor/initialize
// Pricing is never trusted from the client — only type/quantity/chapterId are
// accepted here, and the amount is computed server-side in the service layer.
export const initializeSponsorshipSchema = z
  .object({
    type: SponsorshipTypeEnum,

    quantity: z.coerce
      .number()
      .int()
      .min(1, "You must sponsor at least 1 student.")
      .max(1000, "That's more students than we can process in one payment — please contact us directly for bulk sponsorships.")
      .default(1),

    chapterId: z
      .string({ message: "Please select a chapter to sponsor." })
      .uuid("Invalid chapter selected.")
      .optional(),

    donorName: z
      .string({ message: "Your name is required." })
      .min(2, "Your name must be at least 2 characters.")
      .max(200)
      .trim(),

    donorEmail: z
      .string({ message: "Your email is required." })
      .email("Please enter a valid email address.")
      .max(254)
      .trim()
      .toLowerCase(),
  })
  .refine((data) => data.type !== "CHAPTER" || !!data.chapterId, {
    message: "Please select a chapter to sponsor.",
    path: ["chapterId"],
  });

export type InitializeSponsorshipInput = z.infer<typeof initializeSponsorshipSchema>;
