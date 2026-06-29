// src/__tests__/audit.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { listAuditLogs } from "@/services/audit.service";

type MockPrisma = {
  auditLog: {
    findMany: ReturnType<typeof vi.fn>;
    count:    ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;

describe("audit.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAuditLogs", () => {
    it("lists audit logs with paging", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([{ id: "log-1", action: "CREATE", model: "User" }]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const res = await listAuditLogs({
        page: 1,
        limit: 10,
        from: "2026-01-01",
        to: "2026-12-31",
      });

      expect(res.logs).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(10);
      expect(res.hasNextPage).toBe(false);
      expect(res.hasPrevPage).toBe(false);
    });
  });
});
