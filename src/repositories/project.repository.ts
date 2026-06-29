// src/repositories/project.repository.ts
import { prisma } from "@/lib/prisma";
import type { ProjectStatus } from "@prisma/client";

export interface CreateProjectData {
  chapterId:   string;
  title:       string;
  description: string;
  term:        string;
  status?:     ProjectStatus;
  memberIds?:  string[];
}

export interface UpdateProjectData {
  chapterId?:   string;
  title?:       string;
  description?: string;
  term?:        string;
  status?:      ProjectStatus;
  memberIds?:   string[];
}

export const projectRepository = {
  async create(data: CreateProjectData) {
    const { memberIds, ...rest } = data;
    return prisma.project.create({
      data: {
        ...rest,
        members: {
          create: memberIds?.map((userId) => ({
            userId,
          })) || [],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  },

  async findById(id: string) {
    return prisma.project.findFirst({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  },

  async listAll() {
    return prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  },

  async listByChapter(chapterId: string) {
    return prisma.project.findMany({
      where: { chapterId },
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  },

  async update(id: string, data: UpdateProjectData) {
    const { memberIds, ...rest } = data;
    
    if (memberIds !== undefined) {
      await prisma.projectMember.deleteMany({
        where: { projectId: id },
      });
      return prisma.project.update({
        where: { id },
        data: {
          ...rest,
          members: {
            create: memberIds.map((userId) => ({
              userId,
            })),
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
    }

    return prisma.project.update({
      where: { id },
      data: rest,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  },

  async softDelete(id: string) {
    return prisma.project.delete({ where: { id } });
  },
};
