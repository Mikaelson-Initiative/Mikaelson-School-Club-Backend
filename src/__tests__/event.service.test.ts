// src/__tests__/event.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getPublicEvents, listAdminEvents, createEvent, updateEvent, deleteEvent } from "@/services/event.service";

type MockPrisma = {
  event: {
    findMany:  ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create:    ReturnType<typeof vi.fn>;
    update:    ReturnType<typeof vi.fn>;
    delete:    ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;
const ctx = { actorId: "admin-1", actorEmail: "admin@test.com", ip: "1.2.3.4", userAgent: "vitest" };

describe("event.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPublicEvents", () => {
    it("gets public events with optional date filter", async () => {
      mockPrisma.event.findMany.mockResolvedValue([{ id: "event-1" }]);

      const res = await getPublicEvents({ from: "2026-01-01", to: "2026-12-31" });
      expect(res.upcoming).toHaveLength(1);
      expect(mockPrisma.event.findMany).toHaveBeenCalled();
    });
  });

  describe("listAdminEvents", () => {
    it("lists all events for admin", async () => {
      mockPrisma.event.findMany.mockResolvedValue([{ id: "event-1" }]);

      const res = await listAdminEvents();
      expect(res).toHaveLength(1);
      expect(mockPrisma.event.findMany).toHaveBeenCalled();
    });
  });

  describe("createEvent", () => {
    const input = {
      title: "Science Fair",
      date: "2026-06-20",
      time: "10:00 AM",
      location: "Main Hall",
      description: "Science exhibition",
      isPast: false,
    };

    it("creates an event successfully", async () => {
      mockPrisma.event.create.mockResolvedValue({ id: "event-1", ...input, date: new Date(input.date) });

      const res = await createEvent(input, ctx);
      expect(res.success).toBe(true);
      expect(res.id).toBe("event-1");
      expect(mockPrisma.event.create).toHaveBeenCalled();
    });
  });

  describe("updateEvent", () => {
    it("updates event details", async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: "event-1", title: "Old Title", isPast: false });
      mockPrisma.event.update.mockResolvedValue({ id: "event-1", title: "New Title", isPast: true });

      const res = await updateEvent("event-1", { title: "New Title", isPast: true }, ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.event.update).toHaveBeenCalled();
    });

    it("returns 404 if not found", async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);

      const res = await updateEvent("event-1", { title: "New Title" }, ctx);
      expect(res.success).toBe(false);
    });
  });

  describe("deleteEvent", () => {
    it("deletes event successfully (soft delete)", async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: "event-1", title: "Test Event" });
      mockPrisma.event.delete.mockResolvedValue({ id: "event-1" });

      const res = await deleteEvent("event-1", ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.event.delete).toHaveBeenCalled();
    });

    it("returns 404 if not found", async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);

      const res = await deleteEvent("event-1", ctx);
      expect(res.success).toBe(false);
    });
  });
});
