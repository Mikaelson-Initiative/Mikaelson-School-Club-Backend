// src/__tests__/blog.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getPublicPosts, getPublicPostBySlug, listAdminPosts, createPost, updatePost, deletePost } from "@/services/blog.service";

type MockPrisma = {
  blogPost: {
    findMany:  ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create:    ReturnType<typeof vi.fn>;
    update:    ReturnType<typeof vi.fn>;
    delete:    ReturnType<typeof vi.fn>;
    count:     ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;
const ctx = { actorId: "admin-1", actorEmail: "admin@test.com", ip: "1.2.3.4", userAgent: "vitest" };

describe("blog.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPublicPosts", () => {
    it("gets public posts with search and page filters", async () => {
      mockPrisma.blogPost.findMany.mockResolvedValue([{ id: "post-1", title: "Test Post", slug: "test-post" }]);
      mockPrisma.blogPost.count.mockResolvedValue(1);

      const res = await getPublicPosts({ page: 1, limit: 10 });
      expect(res.posts).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });

  describe("getPublicPostBySlug", () => {
    it("returns null if not found", async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue(null);

      const res = await getPublicPostBySlug("non-existent");
      expect(res).toBeNull();
    });

    it("returns post and increments view count if found", async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue({ id: "post-1", slug: "test-post" });
      mockPrisma.blogPost.update.mockResolvedValue({ id: "post-1", viewCount: 1 });

      const res = await getPublicPostBySlug("test-post");
      expect(res).not.toBeNull();
      // wait a bit for async viewCount increment
      await new Promise((r) => setTimeout(r, 10));
      expect(mockPrisma.blogPost.update).toHaveBeenCalled();
    });
  });

  describe("listAdminPosts", () => {
    it("lists posts for admin", async () => {
      mockPrisma.blogPost.findMany.mockResolvedValue([{ id: "post-1" }]);

      const res = await listAdminPosts(true);
      expect(res).toHaveLength(1);
    });
  });

  describe("createPost", () => {
    const input = {
      title: "My Blog Post",
      category: "News",
      author: "Jane Doe",
      excerpt: "Some short description of the post",
      content: "This is a very long content that exceeds fifty characters of length.",
      isPublished: true,
    };

    it("creates post successfully", async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue(null);
      mockPrisma.blogPost.create.mockResolvedValue({ id: "post-1", ...input, slug: "my-blog-post" });

      const res = await createPost(input, ctx);
      expect(res.success).toBe(true);
      expect(res.slug).toBe("my-blog-post");
    });
  });

  describe("updatePost", () => {
    it("updates post details", async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue({ id: "post-1", title: "Old Title", isPublished: false });
      mockPrisma.blogPost.update.mockResolvedValue({ id: "post-1", title: "New Title", isPublished: true });

      const res = await updatePost("post-1", { title: "New Title", isPublished: true }, ctx);
      expect(res.success).toBe(true);
    });

    it("returns 404 if not found", async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue(null);

      const res = await updatePost("post-1", { title: "New Title" }, ctx);
      expect(res.success).toBe(false);
    });
  });

  describe("deletePost", () => {
    it("soft deletes a post successfully", async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue({ id: "post-1", title: "My Post", slug: "my-post" });
      mockPrisma.blogPost.delete.mockResolvedValue({ id: "post-1" });

      const res = await deletePost("post-1", ctx);
      expect(res.success).toBe(true);
      expect(mockPrisma.blogPost.delete).toHaveBeenCalled();
    });

    it("returns 404 if not found", async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue(null);

      const res = await deletePost("post-1", ctx);
      expect(res.success).toBe(false);
    });
  });
});
