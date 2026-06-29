// src/app/api/auth/reset-confirm/route.ts
// POST /api/auth/reset-confirm
// ─────────────────────────────────────────────────────────────────────────────
// Validates the reset token, checks it hasn't expired or been used,
// hashes the new password, and updates the user record.
// Invalidates the token after successful use.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-helpers";
import { resetConfirmSchema } from "@/lib/validators/user";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetConfirmSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request.";
      return badRequest(message);
    }

    const { token: rawToken, newPassword } = parsed.data;
    const hashedToken = hashToken(rawToken);

    // Look up the token
    const resetToken = await prisma.$queryRaw<
      { id: string; email: string; expiresAt: Date; usedAt: Date | null }[]
    >`
      SELECT id, email, "expiresAt", "usedAt"
      FROM "PasswordResetToken"
      WHERE token = ${hashedToken}
      LIMIT 1
    `;

    if (!resetToken.length) {
      return badRequest("Invalid or expired reset link. Please request a new one.");
    }

    const record = resetToken[0]!;

    if (record.usedAt) {
      return badRequest("This reset link has already been used. Please request a new one.");
    }

    if (new Date() > record.expiresAt) {
      return badRequest("This reset link has expired. Please request a new one.");
    }

    // Find the user
    const user = await prisma.user.findFirst({
      where: { email: record.email, provider: "CREDENTIALS", isDeleted: false },
    });

    if (!user) {
      return badRequest("Account not found.");
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.$executeRaw`
        UPDATE "PasswordResetToken"
        SET "usedAt" = NOW()
        WHERE id = ${record.id}
      `,
    ]);

    const { ip, userAgent } = getRequestMeta(req);
    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "UPDATE",
      model: "User",
      recordId: user.id,
      after: { action: "password_reset" },
      ip,
      userAgent,
    });

    return ok({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/reset-confirm" });
    return serverError();
  }
}