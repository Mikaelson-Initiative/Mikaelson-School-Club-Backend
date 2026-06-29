import { prisma } from "@/lib/prisma";
import type { Role, AuthProvider } from "@prisma/client";

export interface CreateUserData {
  email:         string;
  name?:         string | null;
  role:          Role;
  provider:      AuthProvider;
  passwordHash?: string | null;
  firebaseUid?:  string | null;
  emailVerified?: Date | null;
  gradeLevel?:   string | null;
  chapterId?:    string | null;
  approvedById?: string | null;
  accountStatus?: any;
  accountabilityPartnerId?: string | null;
}

export interface UpdateUserData {
  name?:          string | null;
  role?:          Role;
  passwordHash?:  string | null;
  avatarUrl?:     string | null;
  firebaseUid?:   string | null;
  provider?:      AuthProvider;
  lastLoginAt?:   Date;
  loginCount?:    { increment: number };
  emailVerified?: Date | null;
  isDeleted?:     boolean;
  deletedAt?:     Date | null;
  gradeLevel?:   string | null;
  chapterId?:    string | null;
  approvedById?: string | null;
  accountStatus?: any;
  accountabilityPartnerId?: string | null;
}

export const userRepository = {
  async create(data: CreateUserData) {
    return prisma.user.create({ data });
  },

  async findById(id: string) {
    return prisma.user.findFirst({ where: { id } });
  },

  async findByIdWithDetails(id: string) {
    return prisma.user.findFirst({
      where: { id },
      include: {
        chapter: true,
        approvedBy: true,
        accountabilityPartner: true,
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email } });
  },

  async findByEmailAndProvider(email: string, provider: AuthProvider) {
    return prisma.user.findFirst({ where: { email, provider } });
  },

  async findByFirebaseUid(uid: string) {
    return prisma.user.findFirst({ where: { firebaseUid: uid } });
  },

  async findByChapter(chapterId: string) {
    return prisma.user.findMany({
      where: { chapterId },
      orderBy: { name: "asc" },
    });
  },

  async findPendingApproval(chapterId: string) {
    return prisma.user.findMany({
      where: { chapterId, accountStatus: "PENDING_APPROVAL" },
      orderBy: { createdAt: "asc" },
    });
  },

  async listAll() {
    return prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true,
        provider: true, lastLoginAt: true, loginCount: true,
        createdAt: true, avatarUrl: true, accountStatus: true,
        gradeLevel: true, chapterId: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async update(id: string, data: UpdateUserData) {
    return prisma.user.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};