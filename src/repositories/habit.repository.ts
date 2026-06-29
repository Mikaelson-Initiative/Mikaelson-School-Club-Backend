// src/repositories/habit.repository.ts
import { prisma } from "@/lib/prisma";

export const habitRepository = {
  async create(userId: string, name: string) {
    return prisma.habit.create({
      data: {
        userId,
        name,
      },
    });
  },

  async findById(id: string) {
    return prisma.habit.findFirst({ where: { id } });
  },

  async listAllForUser(userId: string) {
    return prisma.habit.findMany({
      where: { userId, isActive: true },
      include: {
        logs: {
          orderBy: { loggedDate: "desc" },
        },
      },
    });
  },

  async findLog(habitId: string, loggedDate: Date) {
    const startOfDay = new Date(loggedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    return prisma.habitLog.findUnique({
      where: {
        habitId_loggedDate: {
          habitId,
          loggedDate: startOfDay,
        },
      },
    });
  },

  async createLog(habitId: string, userId: string, loggedDate: Date) {
    const startOfDay = new Date(loggedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    return prisma.habitLog.create({
      data: {
        habitId,
        userId,
        loggedDate: startOfDay,
      },
    });
  },

  async getLogsForHabit(habitId: string) {
    return prisma.habitLog.findMany({
      where: { habitId },
      orderBy: { loggedDate: "desc" },
    });
  },
};
