import { contactRepository }                          from "@/repositories/contact.repository";
import { writeAuditLog }                              from "@/lib/audit";
import { sendContactAlert, sendContactAutoReply }     from "@/lib/mailer";
import type { ContactInput, UpdateContactInput }      from "@/lib/validators/contact";
import type { ContactType, MessageStatus }            from "@prisma/client";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export async function submitContact(input: ContactInput, ctx: ActorContext) {
  const contact = await contactRepository.create({
    name:    input.name,
    email:   input.email,
    type:    input.type as ContactType,
    message: input.message,
  });

  await writeAuditLog({
    action:    "CREATE",
    model:     "ContactMessage",
    recordId:  contact.id,
    after:     { name: input.name, email: input.email, type: contact.type },
    ip:        ctx.ip,
    userAgent: ctx.userAgent,
  });

  await Promise.allSettled([
    sendContactAlert({
      name:      input.name,
      email:     input.email,
      type:      contact.type,
      message:   input.message,
      messageId: contact.id,
    }),
    sendContactAutoReply({ to: input.email, name: input.name, type: contact.type }),
  ]);

  return { success: true };
}

export async function listContacts(options: {
  status?: string;
  type?:   string;
  page:    number;
  limit:   number;
}) {
  const { items, total } = await contactRepository.list({
    status: options.status as MessageStatus | undefined,
    type:   options.type   as ContactType   | undefined,
    page:   options.page,
    limit:  options.limit,
  });

  return { messages: items, total, page: options.page, limit: options.limit };
}

export async function updateContact(
  id:    string,
  input: UpdateContactInput,
  ctx:   ActorContext
): Promise<
  | { success: true; data: Awaited<ReturnType<typeof contactRepository.update>> }
  | { success: false; status: number; error: string }
> {
  const existing = await contactRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Message not found." };

  const updated = await contactRepository.update(id, {
    ...(input.status    ? { status: input.status as MessageStatus } : {}),
    ...(input.replyNote !== undefined ? { replyNote: input.replyNote } : {}),
    handledById: ctx.actorId ?? null,
    handledAt:   new Date(),
  });

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "UPDATE",
    model:      "ContactMessage",
    recordId:   id,
    before:     { status: existing.status },
    after:      { status: updated.status  },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true, data: updated };
}