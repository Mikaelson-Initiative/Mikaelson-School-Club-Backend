// src/app/api/auth/reset-request/route.ts
// POST /api/auth/reset-request
// ─────────────────────────────────────────────────────────────────────────────
// Accepts an email, generates a short-lived (1-hour) reset token,
// stores a hashed copy in the DB, and emails the raw token link.
//
// Deliberately returns the same response whether or not the email exists
// to prevent user enumeration attacks.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api-helpers";
import { resetRequestSchema } from "@/lib/validators/user";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { env } from "@/lib/env";
import { captureError } from "@/lib/sentry";

// Hash the raw token before DB storage (prevents plaintext token exposure on DB breach)
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetRequestSchema.safeParse(body);

    // Always return 200 to prevent email enumeration
    if (!parsed.success) {
      return ok({ success: true, message: "If this email is registered, a reset link has been sent." });
    }

    const { email } = parsed.data;

    // Check user exists and uses CREDENTIALS provider
    const user = await prisma.user.findFirst({
      where: { email, provider: "CREDENTIALS", isDeleted: false },
    });

    if (!user) {
      // Same response — don't reveal whether email exists
      return ok({ success: true, message: "If this email is registered, a reset link has been sent." });
    }

    // Invalidate any existing unused tokens for this email
    await prisma.$executeRaw`
      UPDATE "PasswordResetToken"
      SET "usedAt" = NOW()
      WHERE email = ${email} AND "usedAt" IS NULL
    `;

    // Generate a cryptographically secure raw token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        email,
        expiresAt,
      },
    });

    // Build reset URL with the raw (unhashed) token
    const resetUrl = `${env.NEXTAUTH_URL}/admin/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    await sendPasswordResetEmail({
      to: email,
      name: user.name ?? "there",
      resetUrl,
    });

    return ok({ success: true, message: "If this email is registered, a reset link has been sent." });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/reset-request" });
    return serverError();
  }
}