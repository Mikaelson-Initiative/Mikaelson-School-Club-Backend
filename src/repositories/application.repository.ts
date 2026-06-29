// All database access for the Application model lives here.
// No business logic, no email, no HTTP — pure data access only.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import type { ApplicationStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateApplicationData {
  schoolName:       string;
  contactName:      string;
  role:             string;
  email:            string;
  phone?:           string | null;
  location:         string;
  studentsEstimate: number;
  message?:         string | null;
}

export interface UpdateApplicationData {
  status?:       ApplicationStatus;
  adminNotes?:   string | null;
  lastUpdatedById?: string | null;
  lastUpdatedAt?:   Date;
}

export interface ListApplicationsOptions {
  status?: ApplicationStatus;
  search?: string;
  page:    number;
  limit:   number;
}

// ── Repository ────────────────────────────────────────────────────────────────

export const applicationRepository = {
  async create(data: CreateApplicationData) {
    return prisma.application.create({
      data: { ...data, status: "PENDING" },
    });
  },

  async findById(id: string) {
    return prisma.application.findFirst({ where: { id } });
  },

  async findRecentDuplicate(email: string, schoolName: string) {
    return prisma.application.findFirst({
      where: {
        email,
        schoolName,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
  },

  async list({ status, search, page, limit }: ListApplicationsOptions) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { schoolName:  { contains: search, mode: "insensitive" } },
        { email:       { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
      ];
    }
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.application.count({ where }),
    ]);

    return { items, total };
  },

  async update(id: string, data: UpdateApplicationData) {
    return prisma.application.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.application.delete({ where: { id } });
  },
};