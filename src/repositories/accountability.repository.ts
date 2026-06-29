// src/repositories/accountability.repository.ts
import { prisma } from "@/lib/prisma";

export const accountabilityRepository = {
  async setPartner(userId: string, partnerId: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { accountabilityPartnerId: partnerId },
    });
  },

  async createGroup(name: string, memberIds: string[]) {
    return prisma.accountabilityGroup.create({
      data: {
        name,
        members: {
          create: memberIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  },

  async findGroupById(id: string) {
    return prisma.accountabilityGroup.findFirst({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  },

  async listGroupsForUser(userId: string) {
    return prisma.accountabilityGroup.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              include: {
                habits: {
                  where: { isActive: true },
                  include: {
                    logs: {
                      orderBy: { loggedDate: "desc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async getPartnerWithHabits(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: {
        accountabilityPartner: {
          include: {
            habits: {
              where: { isActive: true },
              include: {
                logs: {
                  orderBy: { loggedDate: "desc" },
                },
              },
            },
          },
        },
      },
    });
    return user?.accountabilityPartner || null;
  },
};
