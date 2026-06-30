// src/__tests__/integration/auth.integration.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { authConfig, credentialsAuthorize } from "@/lib/auth";
import { signupUser, verifyEmail } from "@/services/user.service";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/api-helpers";

// Mock api-helpers getSession for the "who am I" tests
vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>(
    "@/lib/api-helpers"
  );
  return {
    ...actual,
    getSession: vi.fn(),
  };
});


function fakeRequest(url: string, method = "GET", body: any = null): Request {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "user-agent": "vitest-integration",
      "x-forwarded-for": "127.0.0.1",
    },
    body: body ? JSON.stringify(body) : null,
  });
}

describe("auth system (integration)", () => {
  beforeEach(async () => {
    vi.mocked(getSession).mockReset();
  });

  describe("Credentials login hardening (authorize callback)", () => {
    it("rejects login if the user does not exist", async () => {
      await expect(
        credentialsAuthorize({ email: "doesnotexist@test.com", password: "password123" })
      ).rejects.toThrow("Invalid email or password.");
    });

    it("rejects login if the user is soft-deleted", async () => {
      const hash = await bcrypt.hash("password123", 12);
      const user = await prisma.user.create({
        data: {
          email: "deleted@test.com",
          role: "ADMIN",
          passwordHash: hash,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      await expect(
        credentialsAuthorize({ email: user.email, password: "password123" })
      ).rejects.toThrow("This account has been deleted.");
    });

    it("rejects login if the user has not verified their email", async () => {
      const hash = await bcrypt.hash("password123", 12);
      const user = await prisma.user.create({
        data: {
          email: "unverified@test.com",
          role: "ADMIN",
          passwordHash: hash,
          emailVerified: null,
        },
      });

      await expect(
        credentialsAuthorize({ email: user.email, password: "password123" })
      ).rejects.toThrow("Please verify your email before logging in.");
    });

    it("succeeds login for active and verified user", async () => {
      const hash = await bcrypt.hash("password123", 12);
      const user = await prisma.user.create({
        data: {
          email: "verified@test.com",
          role: "ADMIN",
          passwordHash: hash,
          emailVerified: new Date(),
        },
      });

      const res = await credentialsAuthorize({ email: user.email, password: "password123" });
      expect(res).not.toBeNull();
      expect(res?.email).toBe(user.email);
    });
  });



  describe("API Endpoint tests", () => {
    // We import routes directly to test them as pure functions or mock Request/Response
    it("POST /api/auth/signup creates a user and verification token", async () => {
      const { POST } = await import("@/app/api/auth/signup/route");
      const req = fakeRequest("http://localhost:3000/api/auth/signup", "POST", {
        email: "signup-api@test.com",
        name: "Signup API",
        password: "password123",
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const dbUser = await prisma.user.findUnique({ where: { email: "signup-api@test.com" } });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.emailVerified).toBeNull(); // Needs verification

      const token = await prisma.verificationToken.findFirst({ where: { email: "signup-api@test.com" } });
      expect(token).not.toBeNull();
      expect(token?.token).toBeDefined();
    });

    it("GET /api/auth/verify marks user verified and redirects", async () => {
      const signupRes = await signupUser({
        email: "verify-api@test.com",
        name: "Verify API",
        password: "password123",
        role: "STUDENT",
      }, { ip: "127.0.0.1" });

      expect(signupRes.success).toBe(true);

      const tokenObj = await prisma.verificationToken.findFirst({ where: { email: "verify-api@test.com" } });
      expect(tokenObj).not.toBeNull();

      const { GET } = await import("@/app/api/auth/verify/route");
      const req = fakeRequest(`http://localhost:3000/api/auth/verify?token=${tokenObj?.token}`);
      
      const response = await GET(req);
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("/admin/login?verified=true");

      const verifiedUser = await prisma.user.findUnique({ where: { email: "verify-api@test.com" } });
      expect(verifiedUser?.emailVerified).not.toBeNull();
    });

    it("POST /api/auth/logout sets expired cookies", async () => {
      const { POST } = await import("@/app/api/auth/logout/route");
      const req = fakeRequest("http://localhost:3000/api/auth/logout", "POST");
      
      const response = await POST(req);
      expect(response.status).toBe(200);

      // Check if cookies were set to expire
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        expect(setCookie).toContain("Max-Age=-1");
      }
    });

    it("GET /api/auth/me returns user profile", async () => {
      const user = await prisma.user.create({
        data: {
          email: "me-profile@test.com",
          role: "ADMIN",
          emailVerified: new Date(),
        },
      });

      vi.mocked(getSession).mockResolvedValue({
        user: { id: user.id, email: user.email, role: user.role },
      } as any);

      const { GET } = await import("@/app/api/auth/me/route");
      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).not.toBeNull();
      expect(body.email).toBe(user.email);
    });

    it("GET /api/auth/me returns null if user is soft-deleted", async () => {
      const user = await prisma.user.create({
        data: {
          email: "me-deleted@test.com",
          role: "ADMIN",
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      vi.mocked(getSession).mockResolvedValue({
        user: { id: user.id, email: user.email, role: user.role },
      } as any);

      const { GET } = await import("@/app/api/auth/me/route");
      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toBeNull();
    });
  });
});
