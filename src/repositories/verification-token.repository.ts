// src/repositories/verification-token.repository.ts
import { prisma } from "@/lib/prisma";

export interface CreateVerificationTokenData {
  email:     string;
  token:     string;
  expiresAt: Date;
}

export const verificationTokenRepository = {
  async create(data: CreateVerificationTokenData) {
    return prisma.verificationToken.create({ data });
  },

  async findByToken(token: string) {
    return prisma.verificationToken.findFirst({ where: { token } });
  },

  async markAsUsed(token: string) {
    return prisma.verificationToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  },
};
