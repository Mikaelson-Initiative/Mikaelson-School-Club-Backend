// src/__tests__/metrics.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getDashboardMetrics } from "@/services/metrics.service";

type MockPrisma = {
  schoolChapter: {
    count:     ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  application: {
    count: ReturnType<typeof vi.fn>;
  };
  contactMessage: {
    count: ReturnType<typeof vi.fn>;
  };
  blogPost: {
    count: ReturnType<typeof vi.fn>;
  };
  event: {
    count: ReturnType<typeof vi.fn>;
  };
  volunteerApplication: {
    count: ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;

describe("metrics.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardMetrics", () => {
    it("aggregates and returns all counts and sums", async () => {
      mockPrisma.schoolChapter.count.mockResolvedValue(5);
      mockPrisma.schoolChapter.aggregate.mockResolvedValue({ _sum: { studentsCount: 150 } });
      mockPrisma.application.count.mockResolvedValue(10);
      mockPrisma.contactMessage.count.mockResolvedValue(2);
      mockPrisma.blogPost.count.mockResolvedValue(4);
      mockPrisma.event.count.mockResolvedValue(3);
      mockPrisma.volunteerApplication.count.mockResolvedValue(10);

      const res = await getDashboardMetrics();
      expect(res.schoolsRegistered).toBe(5);
      expect(res.studentsEnrolled).toBe(150);
      expect(res.volunteerApplications).toBe(10);
      expect(res.upcomingEvents).toBe(3);
    });
  });
});
