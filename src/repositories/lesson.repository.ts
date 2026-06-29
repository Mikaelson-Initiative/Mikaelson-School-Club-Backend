// src/repositories/lesson.repository.ts
import { prisma } from "@/lib/prisma";

export interface CreateLessonData {
  title:            string;
  content:          string;
  category:         string;
  estimatedMinutes?: number;
  skillTags?:       string[];
}

export type UpdateLessonData = Partial<CreateLessonData>;

export const lessonRepository = {
  async create(data: CreateLessonData) {
    return prisma.lesson.create({ data });
  },

  async findById(id: string) {
    return prisma.lesson.findFirst({ where: { id } });
  },

  async listAll() {
    return prisma.lesson.findMany({ orderBy: { createdAt: "desc" } });
  },

  async update(id: string, data: UpdateLessonData) {
    return prisma.lesson.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.lesson.delete({ where: { id } });
  },
};
