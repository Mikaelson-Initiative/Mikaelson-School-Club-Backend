import { prisma } from "@/lib/prisma";
import type { ContactType, MessageStatus } from "@prisma/client";

export interface CreateContactData {
  name:    string;
  email:   string;
  type:    ContactType;
  message: string;
}

export interface UpdateContactData {
  status?:      MessageStatus;
  replyNote?:   string | null;
  handledById?: string | null;
  handledAt?:   Date;
}

export interface ListContactsOptions {
  status?: MessageStatus;
  type?:   ContactType;
  page:    number;
  limit:   number;
}

export const contactRepository = {
  async create(data: CreateContactData) {
    return prisma.contactMessage.create({
      data: { ...data, status: "UNREAD" },
    });
  },

  async findById(id: string) {
    return prisma.contactMessage.findUnique({ where: { id } });
  },

  async list({ status, type, page, limit }: ListContactsOptions) {
    const where = {
      ...(status ? { status } : {}),
      ...(type   ? { type   } : {}),
    };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contactMessage.count({ where }),
    ]);

    return { items, total };
  },

  async update(id: string, data: UpdateContactData) {
    return prisma.contactMessage.update({ where: { id }, data });
  },
};