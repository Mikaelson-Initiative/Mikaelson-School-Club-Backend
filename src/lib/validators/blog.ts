// src/lib/validators/blog.ts
import { z } from "zod";

// POST /api/admin/blog
export const createPostSchema = z.object({
  title: z
    .string({ message: "Title is required." })
    .min(2, "Title must be at least 2 characters.")
    .max(100, "Title cannot exceed 100 characters."),

  category: z
    .string({ message: "Category is required." })
    .min(2, "Category must be at least 2 characters."),

  author: z
    .string({ message: "Author is required." })
    .min(2, "Author must be at least 2 characters."),

  excerpt: z
    .string({ message: "Excerpt is required." })
    .min(10, "Excerpt must be at least 10 characters.")
    .max(300, "Excerpt cannot exceed 300 characters."),

  content: z
    .string({ message: "Content is required." })
    .min(50, "Content must be at least 50 characters.")
    .max(200000, "Content must be under 200,000 characters.")
    .trim(),

  imageUrl: z
    .string()
    .url("Image URL must be a valid URL.")
    .max(1000)
    .optional()
    .nullable(),

  isPublished: z.boolean().default(false),

  metaTitle: z
    .string()
    .max(70, "Meta title must be under 70 characters (SEO best practice).")
    .trim()
    .optional()
    .nullable(),

  metaDescription: z
    .string()
    .max(160, "Meta description must be under 160 characters (SEO best practice).")
    .trim()
    .optional()
    .nullable(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

// PATCH — all fields optional
export const updatePostSchema = createPostSchema.partial();
export type UpdatePostInput = z.infer<typeof updatePostSchema>;