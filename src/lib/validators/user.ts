// src/lib/validators/user.ts
import { z } from "zod";

export const RoleEnum = z.enum(["ADMIN", "SUPERADMIN", "STUDENT", "MENTOR", "CHAMPION"]);
export const AuthProviderEnum = z.enum(["CREDENTIALS", "FIREBASE"]);

// POST /api/admin/users
export const createUserSchema = z
  .object({
    email: z
      .string({ message: "Email is required." })
      .email("A valid email address is required.")
      .max(254)
      .trim()
      .toLowerCase(),

    name: z
      .string()
      .min(2, "Name must be at least 2 characters.")
      .max(100)
      .trim()
      .optional()
      .nullable(),

    role: RoleEnum.default("ADMIN"),

    provider: AuthProviderEnum.default("CREDENTIALS"),

    // Required only when provider is CREDENTIALS
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be under 128 characters.")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.provider === "CREDENTIALS") {
        return !!data.password && data.password.length >= 8;
      }
      return true;
    },
    {
      message: "Password is required for credential-based accounts.",
      path: ["password"],
    }
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;

// PATCH /api/admin/users/[id]
export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).trim().optional().nullable(),
  role: RoleEnum.optional(),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .max(128)
    .optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// POST /api/auth/reset-request
export const resetRequestSchema = z.object({
  email: z
    .string({ message: "Email is required." })
    .email("A valid email address is required.")
    .trim()
    .toLowerCase(),
});

export type ResetRequestInput = z.infer<typeof resetRequestSchema>;

// POST /api/auth/reset-confirm
export const resetConfirmSchema = z.object({
  token: z
    .string({ message: "Reset token is required." })
    .min(1, "Reset token is required."),

  newPassword: z
    .string({ message: "New password is required." })
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be under 128 characters."),

  confirmPassword: z.string({ message: "Please confirm your password." }),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  }
);

export type ResetConfirmInput = z.infer<typeof resetConfirmSchema>;

// POST /api/auth/signup
export const signupSchema = z.object({
  email: z
    .string({ message: "Email is required." })
    .email("A valid email address is required.")
    .max(254)
    .trim()
    .toLowerCase(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(100)
    .trim()
    .optional()
    .nullable(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be under 128 characters."),
  role: z.enum(["STUDENT", "MENTOR"]).default("STUDENT"),
  chapterId: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
});

export type SignupInput = z.infer<typeof signupSchema>;

// PATCH /api/members/me
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100).trim().optional().nullable(),
  gradeLevel: z.string().trim().optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;