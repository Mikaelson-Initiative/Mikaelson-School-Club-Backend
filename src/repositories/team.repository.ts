import { prisma } from "@/lib/prisma";

export interface CreateTeamMemberData {
  name:         string;
  role:         string;
  email:        string;
  avatarUrl?:   string | null;
  bio?:         string | null;
  sortOrder?:   number;
  linkedinUrl?: string | null;
  twitterUrl?:  string | null;
}

export type UpdateTeamMemberData = Partial<CreateTeamMemberData>;

export const teamRepository = {
  async create(data: CreateTeamMemberData) {
    return prisma.teamMember.create({ data });
  },

  async findById(id: string) {
    return prisma.teamMember.findFirst({ where: { id } });
  },

  async findByEmail(email: string) {
    return prisma.teamMember.findFirst({ where: { email } });
  },

  async listPublic() {
    return prisma.teamMember.findMany({
      select: {
        id: true, name: true, role: true, email: true, avatarUrl: true,
        bio: true, sortOrder: true, linkedinUrl: true, twitterUrl: true,
      },
      orderBy: { sortOrder: "asc" },
    });
  },

  async listAdmin() {
    return prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } });
  },

  async update(id: string, data: UpdateTeamMemberData) {
    return prisma.teamMember.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.teamMember.delete({ where: { id } });
  },
};