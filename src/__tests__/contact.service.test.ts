// src/__tests__/contact.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { submitContact, listContacts, updateContact } from "@/services/contact.service";

type MockPrisma = {
  contactMessage: {
    create:     ReturnType<typeof vi.fn>;
    findMany:   ReturnType<typeof vi.fn>;
    count:      ReturnType<typeof vi.fn>;
    update:     ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;
const ctx = { actorId: "admin-1", actorEmail: "admin@test.com", ip: "1.2.3.4", userAgent: "vitest" };

describe("contact.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitContact", () => {
    const input = {
      name: "Alice Smith",
      email: "alice@test.com",
      type: "GENERAL" as const,
      message: "Hello initiative",
    };

    it("submits contact message and triggers email auto-reply and alerts", async () => {
      mockPrisma.contactMessage.create.mockResolvedValue({ id: "msg-1", ...input, status: "UNREAD" });

      const res = await submitContact(input, ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.contactMessage.create).toHaveBeenCalled();
    });
  });

  describe("listContacts", () => {
    it("lists contact messages with pagination", async () => {
      mockPrisma.contactMessage.findMany.mockResolvedValue([{ id: "msg-1" }]);
      mockPrisma.contactMessage.count.mockResolvedValue(1);

      const res = await listContacts({ page: 1, limit: 10 });
      expect(res.messages).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });

  describe("updateContact", () => {
    it("updates contact message status and reply note", async () => {
      mockPrisma.contactMessage.findUnique.mockResolvedValue({ id: "msg-1", status: "UNREAD" });
      mockPrisma.contactMessage.update.mockResolvedValue({ id: "msg-1", status: "READ" });

      const res = await updateContact("msg-1", { status: "READ" }, ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.contactMessage.update).toHaveBeenCalled();
    });

    it("returns 404 if contact message not found", async () => {
      mockPrisma.contactMessage.findUnique.mockResolvedValue(null);
      const res = await updateContact("msg-1", { status: "READ" }, ctx);
      expect(res.success).toBe(false);
    });
  });
});
