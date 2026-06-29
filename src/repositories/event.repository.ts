import { prisma } from "@/lib/prisma";

export interface CreateEventData {
  title:            string;
  date:             Date;
  time:             string;
  location:         string;
  description:      string;
  isPast?:          boolean;
  attendees?:       string | null;
  registrationUrl?: string | null;
  chapterId?:       string | null;
  recurrenceRule?:  string | null;
}

export type UpdateEventData = Partial<CreateEventData>;

export const eventRepository = {
  async create(data: CreateEventData) {
    return prisma.event.create({ data });
  },

  async findById(id: string) {
    return prisma.event.findFirst({ where: { id } });
  },

  async listAll() {
    return prisma.event.findMany({ orderBy: { date: "desc" } });
  },

  async listPublic(dateFilter?: { gte?: Date; lte?: Date }) {
    // Auto-mark any events whose date has now passed
    await prisma.event.updateMany({
      where: { date: { lt: new Date() }, isPast: false },
      data:  { isPast: true },
    });

    const where = dateFilter && Object.keys(dateFilter).length
      ? { date: dateFilter }
      : {};

    const [upcoming, past] = await Promise.all([
      prisma.event.findMany({
        where:   { isPast: false, ...where },
        orderBy: { date: "asc" },
      }),
      prisma.event.findMany({
        where:   { isPast: true, ...where },
        orderBy: { date: "desc" },
        take:    20,
      }),
    ]);

    return { upcoming, past };
  },

  async update(id: string, data: UpdateEventData) {
    return prisma.event.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.event.delete({ where: { id } });
  },

  async countUpcoming() {
    return prisma.event.count({ where: { isPast: false } });
  },

  async upsertAttendance(eventId: string, userId: string, attended: boolean) {
    return prisma.meetingAttendance.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      create: {
        eventId,
        userId,
        attended,
      },
      update: {
        attended,
      },
    });
  },

  async getAttendance(eventId: string) {
    return prisma.meetingAttendance.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  },

  async listUpcomingMeetings(chapterId: string) {
    return prisma.event.findMany({
      where: {
        chapterId,
        isPast: false,
      },
      orderBy: { date: "asc" },
    });
  },
};