import { prisma } from "@/lib/prisma";
import type { SponsorshipStatus, SponsorshipType } from "@prisma/client";

export const sponsorshipRepository = {
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
