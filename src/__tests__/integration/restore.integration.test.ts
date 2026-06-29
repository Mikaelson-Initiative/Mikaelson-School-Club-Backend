// src/__tests__/integration/restore.integration.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Integration test for src/lib/restore.ts — the SUPERADMIN restore flow.
// Verifies real SQL against a real database: the 30-day window check, the
// allowlisted table switch, and the actual UPDATE that clears isDeleted.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma }              from "@/lib/prisma";
import { schoolRepository }    from "@/repositories/school.repository";
import { handleRestore }       from "@/lib/restore";

// auth.ts's getSession is mocked at the module level since real Auth.js
// session resolution requires a live HTTP request context we don't have here.
vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>(
    "@/lib/api-helpers"
  );
  return {
    ...actual,
    getSession: vi.fn(),
  };
});

import { getSession } from "@/lib/api-helpers";

function fakeRequest(): Request {
  return new Request("http://localhost:3000/api/admin/schools/x/restore", {
    method: "POST",
  });
}

describe("handleRestore (integration)", () => {
  beforeEach(async () => {
    vi.mocked(getSession).mockReset();

    // Create the referenced users to satisfy the AuditLog foreign key constraints
    await prisma.user.create({
      data: {
        id: "admin-1",
        email: "admin@test.com",
        role: "SUPERADMIN",
      },
    });

    await prisma.user.create({
      data: {
        id: "admin-2",
        email: "admin2@test.com",
        role: "ADMIN",
      },
    });
  });

  it("restores a chapter deleted less than 30 days ago", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "SUPERADMIN" },
    } as never);

    const chapter = await schoolRepository.create({
      name: "Test Chapter", city: "Lagos", country: "Nigeria",
    });
    await schoolRepository.softDelete(chapter.id);

    const res = await handleRestore(fakeRequest(), "SchoolChapter", chapter.id);
    expect(res.status).toBe(200);

    // Confirm it's actually visible again through the normal repository
    const restored = await schoolRepository.findById(chapter.id);
    expect(restored).not.toBeNull();
    expect(restored?.name).toBe("Test Chapter");
  });

  it("rejects restore when the 30-day window has expired", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "SUPERADMIN" },
    } as never);

    const chapter = await schoolRepository.create({
      name: "Old Chapter", city: "Lagos", country: "Nigeria",
    });
    await schoolRepository.softDelete(chapter.id);

    // Manually backdate deletedAt to 31 days ago via raw SQL
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await prisma.$executeRaw`
      UPDATE "SchoolChapter" SET "deletedAt" = ${thirtyOneDaysAgo} WHERE id = ${chapter.id}
    `;

    const res  = await handleRestore(fakeRequest(), "SchoolChapter", chapter.id);
    const body = await res.json() as { error: string };

    expect(res.status).toBe(403);
    expect(body.error).toContain("expired");

    // Confirm it's still soft-deleted — restore must NOT have happened
    const stillDeleted = await schoolRepository.findById(chapter.id);
    expect(stillDeleted).toBeNull();
  });

  it("rejects restore for a non-SUPERADMIN user", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "admin-2", email: "admin2@test.com", role: "ADMIN" },
    } as never);

    const chapter = await schoolRepository.create({
      name: "Some Chapter", city: "Lagos", country: "Nigeria",
    });
    await schoolRepository.softDelete(chapter.id);

    const res = await handleRestore(fakeRequest(), "SchoolChapter", chapter.id);
    expect(res.status).toBe(403);
  });

  it("returns 404 when the record was never deleted", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "SUPERADMIN" },
    } as never);

    const chapter = await schoolRepository.create({
      name: "Never Deleted", city: "Lagos", country: "Nigeria",
    });
    // No softDelete call

    const res = await handleRestore(fakeRequest(), "SchoolChapter", chapter.id);
    expect(res.status).toBe(404);
  });

  it("writes an audit log entry on successful restore", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "SUPERADMIN" },
    } as never);

    const chapter = await schoolRepository.create({
      name: "Audited Chapter", city: "Lagos", country: "Nigeria",
    });
    await schoolRepository.softDelete(chapter.id);
    await handleRestore(fakeRequest(), "SchoolChapter", chapter.id);

    const logs = await prisma.auditLog.findMany({
      where: { recordId: chapter.id, action: "RESTORE" },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]?.actorId).toBe("admin-1");
  });
});