// src/app/api/contact/route.ts
// POST /api/contact — Public, rate-limited via middleware

import { prisma } from "@/lib/prisma";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { sendContactAlert, sendContactAutoReply } from "@/lib/mailer";
import { ok, badRequest, serverError } from "@/lib/api-helpers";
import { contactSchema } from "@/lib/validators/contact";
import { captureError } from "@/lib/sentry";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON or empty body.");

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const { name, email, type, message } = parsed.data;

    const contact = await prisma.contactMessage.create({
      data: { name, email, type, message, status: "UNREAD" },
    });

    const { ip, userAgent } = getRequestMeta(req);
    await writeAuditLog({
      action: "CREATE",
      model: "ContactMessage",
      recordId: contact.id,
      after: { name, email, type: contact.type },
      ip,
      userAgent,
    });

    await Promise.allSettled([
      sendContactAlert({ name, email, type: contact.type, message, messageId: contact.id }),
      sendContactAutoReply({ to: email, name, type: contact.type }),
    ]);

    return ok({ success: true });
  } catch (err) {
    captureError(err, { route: "POST /api/contact" });
    return serverError();
  }
}