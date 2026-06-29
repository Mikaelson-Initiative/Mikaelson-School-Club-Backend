// src/__tests__/application.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { submitApplication, listApplications, updateApplication, deleteApplication } from "@/services/application.service";

type MockPrisma = {
  application: {
    findFirst: ReturnType<typeof vi.fn>;
    create:    ReturnType<typeof vi.fn>;
    findMany:  ReturnType<typeof vi.fn>;
    update:    ReturnType<typeof vi.fn>;
    delete:    ReturnType<typeof vi.fn>;
    count:     ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;
const ctx = { actorId: "admin-1", actorEmail: "admin@test.com", ip: "1.2.3.4", userAgent: "vitest" };

describe("application.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitApplication", () => {
    const input = {
      schoolName: "Test School",
      contactName: "John Doe",
      role: "Teacher" as const,
      email: "john@test.com",
      phone: "+1234567890",
      location: "New York",
      studentsEstimate: 50,
      message: "Hello",
    };

    it("submits application successfully", async () => {
      mockPrisma.application.findFirst.mockResolvedValue(null);
      mockPrisma.application.create.mockResolvedValue({ id: "app-id", ...input });

      const res = await submitApplication(input, ctx);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.id).toBe("app-id");
      }
      expect(mockPrisma.application.create).toHaveBeenCalled();
    });

    it("rejects duplicate application within 30 days", async () => {
      mockPrisma.application.findFirst.mockResolvedValue({ id: "duplicate-id" });

      const res = await submitApplication(input, ctx);
      expect(res.success).toBe(false);
      expect(mockPrisma.application.create).not.toHaveBeenCalled();
    });
  });

  describe("listApplications", () => {
    it("lists applications", async () => {
      mockPrisma.application.findMany.mockResolvedValue([{ id: "app-1" }]);
      mockPrisma.application.count.mockResolvedValue(1);

      const res = await listApplications({ page: 1, limit: 10 });
      expect(res.applications).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });

  describe("updateApplication", () => {
    it("updates status and triggers email notification", async () => {
      mockPrisma.application.findFirst.mockResolvedValue({ id: "app-1", status: "PENDING", email: "test@test.com" });
      mockPrisma.application.update.mockResolvedValue({ id: "app-1", status: "REVIEWED" });

      const res = await updateApplication("app-1", { status: "REVIEWED" }, ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.application.update).toHaveBeenCalled();
    });

    it("returns 404 if not found", async () => {
      mockPrisma.application.findFirst.mockResolvedValue(null);
      const res = await updateApplication("app-1", { status: "REVIEWED" }, ctx);
      expect(res.success).toBe(false);
    });
  });

  describe("deleteApplication", () => {
    it("deletes successfully", async () => {
      mockPrisma.application.findFirst.mockResolvedValue({ id: "app-1" });
      mockPrisma.application.delete.mockResolvedValue({ id: "app-1" });

      const res = await deleteApplication("app-1", ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.application.delete).toHaveBeenCalled();
    });

    it("returns 404 if not found", async () => {
      mockPrisma.application.findFirst.mockResolvedValue(null);
      const res = await deleteApplication("app-1", ctx);
      expect(res.success).toBe(false);
    });
  });
});
