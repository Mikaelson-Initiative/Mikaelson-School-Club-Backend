// src/__tests__/user.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { listUsers, createUser, updateUser, deleteUser, signupUser, verifyEmail } from "@/services/user.service";

type MockPrisma = {
  user: {
    findMany:  ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create:    ReturnType<typeof vi.fn>;
    update:    ReturnType<typeof vi.fn>;
    delete:    ReturnType<typeof vi.fn>;
  };
  verificationToken: {
    create:    ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update:    ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;
const ctx = { actorId: "admin-1", actorEmail: "admin@test.com", ip: "1.2.3.4", userAgent: "vitest" };

describe("user.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listUsers", () => {
    it("lists all users", async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1", email: "test@test.com" }]);

      const res = await listUsers();
      expect(res).toHaveLength(1);
    });
  });

  describe("createUser", () => {
    const input = {
      email: "new@user.com",
      name: "New User",
      role: "ADMIN" as const,
      provider: "CREDENTIALS" as const,
      password: "password123",
    };

    it("creates a user successfully", async () => {
      mockPrisma.user.create.mockResolvedValue({ id: "user-2", email: input.email, role: input.role, provider: input.provider });

      const res = await createUser(input, ctx);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.id).toBe("user-2");
      }
    });

    it("handles Prisma P2002 duplicate email error", async () => {
      const dbError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      });
      mockPrisma.user.create.mockRejectedValue(dbError);

      const res = await createUser(input, ctx);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(400);
      }
    });
  });

  describe("updateUser", () => {
    it("updates user details successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "user-2", role: "ADMIN" });
      mockPrisma.user.update.mockResolvedValue({ id: "user-2", role: "SUPERADMIN" });

      const res = await updateUser("user-2", { role: "SUPERADMIN" }, ctx, "admin-1");
      expect(res.success).toBe(true);
    });

    it("prevents demoting oneself", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "admin-1", role: "SUPERADMIN" });

      const res = await updateUser("admin-1", { role: "ADMIN" }, ctx, "admin-1");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(403);
      }
    });

    it("returns 404 if user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const res = await updateUser("user-2", { name: "test" }, ctx, "admin-1");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(404);
      }
    });
  });

  describe("deleteUser", () => {
    it("soft deletes a user successfully", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "user-2", email: "user2@test.com", role: "ADMIN" });
      mockPrisma.user.delete.mockResolvedValue({ id: "user-2" });

      const res = await deleteUser("user-2", ctx, "admin-1");
      expect(res.success).toBe(true);
    });

    it("prevents self deletion", async () => {
      const res = await deleteUser("admin-1", ctx, "admin-1");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(403);
      }
    });

    it("returns 404 if user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const res = await deleteUser("user-2", ctx, "admin-1");
      expect(res.success).toBe(false);
    });
  });

  describe("signupUser", () => {
    const signupInput = {
      email: "signup@test.com",
      name: "Signup User",
      password: "password123",
      role: "STUDENT" as const,
    };

    it("signs up a new user successfully", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: "user-3", email: signupInput.email, role: "ADMIN", provider: "CREDENTIALS" });
      mockPrisma.verificationToken.create.mockResolvedValue({ id: "token-1", token: "token-abc" });

      const res = await signupUser(signupInput, ctx);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.id).toBe("user-3");
      }
    });

    it("fails if user is already registered and active", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-3", email: signupInput.email, isDeleted: false });

      const res = await signupUser(signupInput, ctx);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(400);
        expect(res.error).toContain("exists");
      }
    });

    it("reactivates a soft-deleted user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-3", email: signupInput.email, isDeleted: true });
      mockPrisma.user.update.mockResolvedValue({ id: "user-3", email: signupInput.email, role: "ADMIN", provider: "CREDENTIALS" });
      mockPrisma.verificationToken.create.mockResolvedValue({ id: "token-1", token: "token-abc" });

      const res = await signupUser(signupInput, ctx);
      expect(res.success).toBe(true);
    });
  });

  describe("verifyEmail", () => {
    it("verifies a valid token successfully", async () => {
      mockPrisma.verificationToken.findFirst.mockResolvedValue({
        email: "test@verify.com",
        token: "valid-token",
        expiresAt: new Date(Date.now() + 1000 * 60),
        usedAt: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-4", email: "test@verify.com", isDeleted: false });
      mockPrisma.user.update.mockResolvedValue({ id: "user-4" });
      mockPrisma.verificationToken.update.mockResolvedValue({ token: "valid-token" });

      const res = await verifyEmail("valid-token", ctx);
      expect(res.success).toBe(true);
    });

    it("fails if token not found", async () => {
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      const res = await verifyEmail("invalid-token", ctx);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(404);
      }
    });

    it("fails if token already used", async () => {
      mockPrisma.verificationToken.findFirst.mockResolvedValue({
        email: "test@verify.com",
        token: "used-token",
        expiresAt: new Date(Date.now() + 1000 * 60),
        usedAt: new Date(),
      });

      const res = await verifyEmail("used-token", ctx);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(400);
      }
    });

    it("fails if token expired", async () => {
      mockPrisma.verificationToken.findFirst.mockResolvedValue({
        email: "test@verify.com",
        token: "expired-token",
        expiresAt: new Date(Date.now() - 1000 * 60),
        usedAt: null,
      });

      const res = await verifyEmail("expired-token", ctx);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(400);
      }
    });
  });
});
