// src/__tests__/integration/application.repository.integration.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Integration test: real Postgres, real Prisma client, real soft-delete
// extension. No mocks below the repository layer.
//
// This is what unit tests CANNOT verify: that the Prisma $extends soft-delete
// logic actually rewrites SQL correctly against a real database engine.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { prisma }                from "@/lib/prisma";
import { applicationRepository } from "@/repositories/application.repository";

const sampleInput = {
  schoolName:       "Igbobi College",
  contactName:      "Jane Doe",
  role:             "Principal",
  email:            "jane@igbobi.edu.ng",
  location:         "Lagos, Nigeria",
  studentsEstimate: 40,
};

describe("applicationRepository (integration)", () => {
  it("creates a record with PENDING status and a generated UUID", async () => {
    const created = await applicationRepository.create(sampleInput);

    expect(created.id).toBeTruthy();
    expect(created.status).toBe("PENDING");
    expect(created.schoolName).toBe("Igbobi College");
  });

  it("findById returns null for a non-existent id (not throws)", async () => {
    const result = await applicationRepository.findById(
      "00000000-0000-0000-0000-000000000000"
    );
    expect(result).toBeNull();
  });

  it("findRecentDuplicate detects a match within the 30-day window", async () => {
    await applicationRepository.create(sampleInput);

    const duplicate = await applicationRepository.findRecentDuplicate(
      sampleInput.email,
      sampleInput.schoolName
    );

    expect(duplicate).not.toBeNull();
  });

  it("findRecentDuplicate returns null for a different school", async () => {
    await applicationRepository.create(sampleInput);

    const result = await applicationRepository.findRecentDuplicate(
      sampleInput.email,
      "A Completely Different School"
    );

    expect(result).toBeNull();
  });

  it("list() paginates and sorts by createdAt descending", async () => {
    // Create three applications with a tiny delay so createdAt ordering is unambiguous
    const first  = await applicationRepository.create({ ...sampleInput, schoolName: "School A" });
    await new Promise((r) => setTimeout(r, 5));
    const second = await applicationRepository.create({ ...sampleInput, schoolName: "School B" });
    await new Promise((r) => setTimeout(r, 5));
    const third  = await applicationRepository.create({ ...sampleInput, schoolName: "School C" });

    const { items, total } = await applicationRepository.list({ page: 1, limit: 20 });

    expect(total).toBe(3);
    expect(items[0]?.id).toBe(third.id);  // newest first
    expect(items[2]?.id).toBe(first.id);  // oldest last
  });

  it("list() respects the limit and page parameters", async () => {
    for (let i = 0; i < 5; i++) {
      await applicationRepository.create({ ...sampleInput, schoolName: `School ${i}` });
    }

    const page1 = await applicationRepository.list({ page: 1, limit: 2 });
    const page2 = await applicationRepository.list({ page: 2, limit: 2 });

    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
    expect(page1.total).toBe(5);
  });

  // ── Soft delete — the part unit tests cannot prove ──────────────────────────
  it("softDelete sets isDeleted=true and the record disappears from findById", async () => {
    const created = await applicationRepository.create(sampleInput);

    await applicationRepository.softDelete(created.id);

    // findById uses the soft-delete-aware extension — must return null now
    const afterDelete = await applicationRepository.findById(created.id);
    expect(afterDelete).toBeNull();
  });

  it("softDelete excludes the record from list() results", async () => {
    const created = await applicationRepository.create(sampleInput);
    await applicationRepository.softDelete(created.id);

    const { items, total } = await applicationRepository.list({ page: 1, limit: 20 });

    expect(total).toBe(0);
    expect(items).toHaveLength(0);
  });

  it("the row still physically exists in the table after soft delete", async () => {
    const created = await applicationRepository.create(sampleInput);
    await applicationRepository.softDelete(created.id);

    // Bypass the soft-delete extension entirely with raw SQL to prove
    // this was a soft delete (UPDATE), not a real DELETE
    const raw = await prisma.$queryRaw<{ id: string; isDeleted: boolean; deletedAt: Date | null }[]>`
      SELECT id, "isDeleted", "deletedAt" FROM "Application" WHERE id = ${created.id}
    `;

    expect(raw).toHaveLength(1);
    expect(raw[0]?.isDeleted).toBe(true);
    expect(raw[0]?.deletedAt).not.toBeNull();
  });

  it("update() persists changes and returns the updated record", async () => {
    const created = await applicationRepository.create(sampleInput);

    const updated = await applicationRepository.update(created.id, {
      status: "REVIEWED",
      adminNotes: "Looks promising",
    });

    expect(updated.status).toBe("REVIEWED");
    expect(updated.adminNotes).toBe("Looks promising");

    // Re-fetch independently to confirm it actually persisted, not just returned in-memory
    const refetched = await applicationRepository.findById(created.id);
    expect(refetched?.status).toBe("REVIEWED");
  });
});