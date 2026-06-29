// src/__tests__/school.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { listAdminSchools, createSchool, updateSchool, deleteSchool } from "@/services/school.service";

type MockPrisma = {
  schoolChapter: {
    findMany:  ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create:    ReturnType<typeof vi.fn>;
    update:    ReturnType<typeof vi.fn>;
    delete:    ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;
const ctx = { actorId: "admin-1", actorEmail: "admin@test.com", ip: "1.2.3.4", userAgent: "vitest" };

describe("school.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAdminSchools", () => {
    it("lists school chapters for admin", async () => {
      mockPrisma.schoolChapter.findMany.mockResolvedValue([{ id: "school-1" }]);

      const res = await listAdminSchools({ status: "ACTIVE" });
      expect(res).toHaveLength(1);
      expect(mockPrisma.schoolChapter.findMany).toHaveBeenCalled();
    });
  });

  describe("createSchool", () => {
    const input = {
      name: "Greenwood Academy",
      city: "Lekki",
      country: "Nigeria",
      status: "REGISTERED" as const,
      studentsCount: 20,
    };

    it("creates school chapter successfully", async () => {
      mockPrisma.schoolChapter.findFirst.mockResolvedValue(null);
      mockPrisma.schoolChapter.create.mockResolvedValue({ id: "school-1", ...input });

      const res = await createSchool(input, ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.schoolChapter.create).toHaveBeenCalled();
    });

    it("returns error if name is duplicate", async () => {
      mockPrisma.schoolChapter.findFirst.mockResolvedValue({ id: "existing-school" });

      const res = await createSchool(input, ctx);
      expect(res.success).toBe(false);
      expect(mockPrisma.schoolChapter.create).not.toHaveBeenCalled();
    });
  });

  describe("updateSchool", () => {
    it("updates school chapter", async () => {
      mockPrisma.schoolChapter.findFirst.mockResolvedValue({ id: "school-1", name: "Old Name", status: "REGISTERED" });
      mockPrisma.schoolChapter.update.mockResolvedValue({ id: "school-1", name: "New Name", status: "ACTIVE" });

      const res = await updateSchool("school-1", { name: "New Name", status: "ACTIVE" }, ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.schoolChapter.update).toHaveBeenCalled();
    });

    it("returns 404 if not found", async () => {
      mockPrisma.schoolChapter.findFirst.mockResolvedValue(null);

      const res = await updateSchool("school-1", { name: "New Name" }, ctx);
      expect(res.success).toBe(false);
    });
  });

  describe("deleteSchool", () => {
    it("deletes school chapter successfully (soft delete)", async () => {
      mockPrisma.schoolChapter.findFirst.mockResolvedValue({ id: "school-1", name: "Test School", status: "ACTIVE" });
      mockPrisma.schoolChapter.delete.mockResolvedValue({ id: "school-1" });

      const res = await deleteSchool("school-1", ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.schoolChapter.delete).toHaveBeenCalled();
    });

    it("returns 404 if not found", async () => {
      mockPrisma.schoolChapter.findFirst.mockResolvedValue(null);

      const res = await deleteSchool("school-1", ctx);
      expect(res.success).toBe(false);
    });
  });
});
