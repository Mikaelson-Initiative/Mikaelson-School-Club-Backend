import { prisma, Prisma } from "@/lib/prisma";
import type { ChapterStatus } from "@prisma/client";

export interface CreateSchoolData {
  name:               string;
  city:               string;
  country:            string;
  status?:            ChapterStatus;
  studentsCount?:     number;
  coordinatorName?:   string | null;
  coordinatorEmail?:  string | null;
  coordinatorPhone?:  string | null;
  notes?:             string | null;
}

export interface UpdateSchoolData {
  name?:              string;
  city?:              string;
  country?:           string;
  status?:            ChapterStatus;
  studentsCount?:     number;
  coordinatorName?:   string | null;
  coordinatorEmail?:  string | null;
  coordinatorPhone?:  string | null;
  notes?:             string | null;
}

export interface ListSchoolsOptions {
  status?:  ChapterStatus;
  country?: string;
}

export const schoolRepository = {
  async create(data: CreateSchoolData) {
    return prisma.schoolChapter.create({ data });
  },

  async findById(id: string) {
    return prisma.schoolChapter.findFirst({ where: { id } });
  },

  async findByName(name: string) {
    return prisma.schoolChapter.findFirst({ where: { name } });
  },

  /** Public list — excludes INACTIVE chapters, returns safe subset of fields */
  async listPublic() {
    return prisma.schoolChapter.findMany({
      where:   { status: { not: "INACTIVE" } },
      select:  {
        id: true, name: true, city: true, country: true,
        status: true, studentsCount: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Admin list — full records, supports filters */
  async listAdmin({ status, country }: ListSchoolsOptions) {
    return prisma.schoolChapter.findMany({
      where:   {
        ...(status  ? { status  } : {}),
        ...(country ? { country } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async update(id: string, data: UpdateSchoolData) {
    return prisma.schoolChapter.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.schoolChapter.delete({ where: { id } });
  },

  async aggregateStudents() {
    return prisma.schoolChapter.aggregate({ _sum: { studentsCount: true } });
  },

  async countByStatus(status: ChapterStatus) {
    return prisma.schoolChapter.count({ where: { status } });
  },

  async countAll() {
    return prisma.schoolChapter.count();
  },

  async findFeatured() {
    return prisma.schoolChapter.findFirst({
      where: { isChapterOfMonth: true },
    });
  },

  async setFeatured(id: string) {
    return prisma.$transaction([
      prisma.schoolChapter.updateMany({
        where: { isChapterOfMonth: true },
        data: { isChapterOfMonth: false, chapterOfMonthSince: null },
      }),
      prisma.schoolChapter.update({
        where: { id },
        data: { isChapterOfMonth: true, chapterOfMonthSince: new Date() },
      }),
    ]);
  },

  async getRoster(id: string) {
    return prisma.user.findMany({
      where: { chapterId: id, accountStatus: "ACTIVE" },
      select: {
        id: true,
        name: true,
        role: true,
        gradeLevel: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    });
  },
};