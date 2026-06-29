// src/__tests__/integration/blog.service.integration.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Integration test for blog slug collision handling — this needs a real
// unique constraint to actually trigger, which mocked repositories can't
// genuinely exercise (the mock just returns whatever you tell it to).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";
import { createPost, updatePost, getPublicPostBySlug } from "@/services/blog.service";
import { prisma } from "@/lib/prisma";

const ctx = { actorId: "admin-1", actorEmail: "admin@test.com", ip: "1.2.3.4", userAgent: "vitest" };

const baseInput = {
  title:    "How Tracking My Habits Changed My Grades",
  category: "Student Story",
  author:   "Amara O.",
  excerpt:  "A short summary of the post.",
  content:  "Full content goes here. ".repeat(20),
  isPublished: false,
};

describe("blog.service (integration) — slug generation", () => {
  beforeEach(async () => {
    // Create the referenced user to satisfy AuditLog foreign key constraints
    await prisma.user.create({
      data: {
        id: "admin-1",
        email: "admin@test.com",
        role: "SUPERADMIN",
      },
    });
  });

  it("creates a post with a slug derived from the title", async () => {
    const result = await createPost(baseInput, ctx);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.slug).toBe("how-tracking-my-habits-changed-my-grades");
    }
  });

  it("appends a unique suffix when the slug already exists in the database", async () => {
    const first  = await createPost(baseInput, ctx);
    const second = await createPost(baseInput, ctx); // same title again

    expect(first.success && second.success).toBe(true);
    if (first.success && second.success) {
      expect(first.slug).toBe("how-tracking-my-habits-changed-my-grades");
      expect(second.slug).not.toBe(first.slug);
      expect(second.slug).toMatch(/^how-tracking-my-habits-changed-my-grades-/);
    }
  });

  it("a third submission of the same title also gets a unique slug (not colliding with the second)", async () => {
    const first  = await createPost(baseInput, ctx);
    const second = await createPost(baseInput, ctx);
    const third  = await createPost(baseInput, ctx);

    const slugs = [first, second, third]
      .filter((r) => r.success)
      .map((r) => (r as { slug: string }).slug);

    expect(new Set(slugs).size).toBe(3); // all unique
  });

  it("only published posts are visible via getPublicPostBySlug", async () => {
    const result = await createPost({ ...baseInput, isPublished: false }, ctx);
    if (!result.success) throw new Error("setup failed");

    const found = await getPublicPostBySlug(result.slug);
    expect(found).toBeNull();
  });

  it("sets publishedAt exactly once — re-publishing doesn't reset the original timestamp", async () => {
    const created = await createPost({ ...baseInput, isPublished: true }, ctx);
    if (!created.success) throw new Error("setup failed");

    const originalPost = await prisma.blogPost.findFirst({ where: { id: created.id } });
    const originalPublishedAt = originalPost?.publishedAt;

    // Wait a moment, then update the post (still published) — publishedAt must not change
    await new Promise((r) => setTimeout(r, 10));
    await updatePost(created.id, { title: "Updated Title", isPublished: true }, ctx);

    const refetched = await prisma.blogPost.findFirst({ where: { id: created.id } });
    expect(refetched?.publishedAt?.getTime()).toBe(originalPublishedAt?.getTime());
    expect(refetched?.title).toBe("Updated Title");
  });

  it("view count increments after a public fetch", async () => {
    const created = await createPost({ ...baseInput, isPublished: true }, ctx);
    if (!created.success) throw new Error("setup failed");

    await getPublicPostBySlug(created.slug);
    // incrementViewCount is fire-and-forget — give it a tick
    await new Promise((r) => setTimeout(r, 50));

    const post = await prisma.blogPost.findFirst({ where: { id: created.id } });
    expect(post?.viewCount).toBe(1);
  });
});