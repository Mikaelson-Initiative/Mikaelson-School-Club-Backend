import { prisma } from "@/lib/prisma";
import type { SponsorshipStatus, SponsorshipType } from "@prisma/client";

export const sponsorshipRepository = {
  async list(options: { status?: SponsorshipStatus; type?: SponsorshipType; page: number; limit: number }) {
    const where = {
      ...(options.status ? { status: options.status } : {}),
      ...(options.type ? { type: options.type } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.sponsorship.findMany({
        where,
        include: { chapter: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.sponsorship.count({ where }),
    ]);

    return { items, total };
  },

  async summary() {
    const [totalRaisedKobo, successCount, pendingCount] = await Promise.all([
      prisma.sponsorship.aggregate({ where: { status: "SUCCESS" }, _sum: { amountKobo: true } }),
      prisma.sponsorship.count({ where: { status: "SUCCESS" } }),
      prisma.sponsorship.count({ where: { status: "PENDING" } }),
    ]);
    return {
      totalRaisedKobo: totalRaisedKobo._sum.amountKobo ?? 0,
      successCount,
      pendingCount,
    };
  },

  async create(data: {
    type: SponsorshipType;
    quantity: number;
    chapterId: string | null;
    amountKobo: number;
    donorName: string;
    donorEmail: string;
    reference: string;
  }) {
    return prisma.sponsorship.create({ data });
  },

  async findByReference(reference: string) {
    return prisma.sponsorship.findUnique({
      where: { reference },
      include: { chapter: { select: { id: true, name: true } } },
    });
  },

  async markStatus(reference: string, status: SponsorshipStatus, paidAt: Date | null) {
    return prisma.sponsorship.update({
      where: { reference },
      data: { status, paidAt },
    });
  },
};
