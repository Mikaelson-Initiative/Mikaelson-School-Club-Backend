// All database access for the VolunteerApplication model lives here.
// No business logic, no email, no HTTP — pure data access only.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import type { ApplicationStatus } from "@prisma/client";

export interface CreateVolunteerData {
  name:        string;
  email:       string;
  phone?:      string | null;
  role:        string;
  org?:        string | null;
  location?:   string | null;
  motivation?: string | null;
}

export interface UpdateVolunteerData {
  status?: ApplicationStatus;
}

export interface ListVolunteersOptions {
  status?: ApplicationStatus;
  search?: string;
  page:    number;
  limit:   number;
}

export const volunteerRepository = {
  async create(data: CreateVolunteerData) {
    return prisma.volunteerApplication.create({
      data: { ...data, status: "PENDING" },
    });
  },

  async findById(id: string) {
    return prisma.volunteerApplication.findFirst({ where: { id } });
  },

  async findRecentDuplicate(email: string) {
    return prisma.volunteerApplication.findFirst({
      where: {
        email,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
  },

  async list({ status, search, page, limit }: ListVolunteersOptions) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { role:  { contains: search, mode: "insensitive" } },
      ];
    }
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.volunteerApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.volunteerApplication.count({ where }),
    ]);

    return { items, total };
  },

  async update(id: string, data: UpdateVolunteerData) {
    return prisma.volunteerApplication.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.volunteerApplication.delete({ where: { id } });
  },
};
