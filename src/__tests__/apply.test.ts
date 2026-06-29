// src/__tests__/apply.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/apply/route";

// ── Typed mock shape ──────────────────────────────────────────────────────────
// Avoids Record<string, ...> index signatures which produce T | undefined
// under noUncheckedIndexedAccess, causing TS18048 errors.
type MockPrisma = {
  application: {
    findFirst: ReturnType<typeof vi.fn>;
    create:    ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  schoolName:       "Test Secondary School",
  contactName:      "John Doe",
  role:             "Principal",
  email:            "john@testschool.edu",
  location:         "Lagos, Nigeria",
  studentsEstimate: 30,
};

describe("POST /api/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.application.findFirst.mockResolvedValue(null);
    mockPrisma.application.create.mockResolvedValue({ id: "test-uuid", ...validBody });
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it("returns 201 with a valid payload", async () => {
    const res  = await POST(makeRequest(validBody));
    const json = await res.json() as { success: boolean; id?: string };
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.id).toBeDefined();
  });

  it("returns 400 when schoolName is missing", async () => {
    const { schoolName: _s, ...body } = validBody;
    const res  = await POST(makeRequest(body));
    const json = await res.json() as { error: string };
    expect(res.status).toBe(400);
    expect(json.error).toContain("School name");
  });

  it("returns 400 for an invalid email", async () => {
    const res  = await POST(makeRequest({ ...validBody, email: "not-an-email" }));
    const json = await res.json() as { error: string };
    expect(res.status).toBe(400);
    expect(json.error.toLowerCase()).toContain("email");
  });

  it("returns 400 for a negative studentsEstimate", async () => {
    const res = await POST(makeRequest({ ...validBody, studentsEstimate: -5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a duplicate application within 30 days", async () => {
    mockPrisma.application.findFirst.mockResolvedValue({ id: "existing" });
    const res  = await POST(makeRequest(validBody));
    const json = await res.json() as { error: string };
    expect(res.status).toBe(400);
    expect(json.error).toContain("already submitted");
  });

  it("accepts an optional phone number in valid format", async () => {
    const res = await POST(makeRequest({ ...validBody, phone: "+2348012345678" }));
    expect(res.status).toBe(201);
  });

  it("returns 400 for a malformed phone number", async () => {
    const res = await POST(makeRequest({ ...validBody, phone: "not-a-phone" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an empty body", async () => {
    const res = await POST(new Request("http://localhost:3000/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));
    const json = await res.json() as { error: string };
    expect(res.status).toBe(400);
    expect(json.error).toContain("Invalid JSON or empty body");
  });

  it("returns 400 for invalid JSON syntax", async () => {
    const res = await POST(new Request("http://localhost:3000/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json }",
    }));
    const json = await res.json() as { error: string };
    expect(res.status).toBe(400);
    expect(json.error).toContain("Invalid JSON or empty body");
  });
});