// src/__tests__/team.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getPublicTeam, listAdminTeam, createTeamMember, updateTeamMember, deleteTeamMember } from "@/services/team.service";

type MockPrisma = {
  teamMember: {
    findMany:  ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create:    ReturnType<typeof vi.fn>;
    update:    ReturnType<typeof vi.fn>;
    delete:    ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;
const ctx = { actorId: "admin-1", actorEmail: "admin@test.com", ip: "1.2.3.4", userAgent: "vitest" };

describe("team.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPublicTeam", () => {
    it("gets public team members sorted by sortOrder", async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([{ id: "team-1" }]);

      const res = await getPublicTeam();
      expect(res).toHaveLength(1);
      expect(mockPrisma.teamMember.findMany).toHaveBeenCalled();
    });
  });

  describe("listAdminTeam", () => {
    it("lists all team members for admin", async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([{ id: "team-1" }]);

      const res = await listAdminTeam();
      expect(res).toHaveLength(1);
    });
  });

  describe("createTeamMember", () => {
    const input = {
      name: "John Doe",
      role: "Lead Developer",
      email: "john@test.com",
      bio: "A bio",
      sortOrder: 1,
    };

    it("creates a team member successfully", async () => {
      mockPrisma.teamMember.create.mockResolvedValue({ id: "team-1", ...input });

      const res = await createTeamMember(input, ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.teamMember.create).toHaveBeenCalled();
    });

    it("handles Prisma P2002 duplicate email error", async () => {
      const dbError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      mockPrisma.teamMember.create.mockRejectedValue(dbError);

      const res = await createTeamMember(input, ctx);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(400);
      }
    });
  });

  describe("updateTeamMember", () => {
    it("updates team member details", async () => {
      mockPrisma.teamMember.findFirst.mockResolvedValue({ id: "team-1", name: "Old Name", role: "Dev" });
      mockPrisma.teamMember.update.mockResolvedValue({ id: "team-1", name: "New Name", role: "Senior Dev" });

      const res = await updateTeamMember("team-1", { name: "New Name", role: "Senior Dev" }, ctx);
      expect(res.success).toBe(true);
    });

    it("returns 404 if not found", async () => {
      mockPrisma.teamMember.findFirst.mockResolvedValue(null);

      const res = await updateTeamMember("team-1", { name: "New Name" }, ctx);
      expect(res.success).toBe(false);
    });
  });

  describe("deleteTeamMember", () => {
    it("soft deletes team member successfully", async () => {
      mockPrisma.teamMember.findFirst.mockResolvedValue({ id: "team-1", name: "Test User", email: "test@test.com" });
      mockPrisma.teamMember.delete.mockResolvedValue({ id: "team-1" });

      const res = await deleteTeamMember("team-1", ctx);
      expect(res.success).toBe(true);
    });

    it("returns 404 if not found", async () => {
      mockPrisma.teamMember.findFirst.mockResolvedValue(null);

      const res = await deleteTeamMember("team-1", ctx);
      expect(res.success).toBe(false);
    });
  });
});
