// src/__tests__/blog.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as listGET } from "@/app/api/blog/route";
import { GET as getGET } from "@/app/api/blog/[slug]/route";

type MockPrisma = {
  blogPost: {
    findMany:  ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update:    ReturnType<typeof vi.fn>;
    count:     ReturnType<typeof vi.fn>;
  };
};

const mockPrisma = prisma as unknown as MockPrisma;

describe("Public Blog API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/blog", () => {
    it("returns 200 with list of published posts", async () => {
      mockPrisma.blogPost.findMany.mockResolvedValue([
        { id: "post-1", slug: "inspiring-story-1", title: "Inspiring Story 1", category: "Stories", isPublished: true },
      ]);
      mockPrisma.blogPost.count.mockResolvedValue(1);

      const req = new Request("http://localhost:3000/api/blog?search=inspiring&category=Stories");
      const res = await listGET(req);
      const json = await res.json() as { posts: any[]; total: number };

      expect(res.status).toBe(200);
      expect(json.posts).toHaveLength(1);
      expect(json.total).toBe(1);
      expect(json.posts[0].slug).toBe("inspiring-story-1");
    });
  });

  describe("GET /api/blog/[slug]", () => {
    it("returns 200 and the post if found and published", async () => {
      const mockPost = { id: "post-1", slug: "inspiring-story-1", title: "Inspiring Story 1", isPublished: true };
      mockPrisma.blogPost.findFirst.mockResolvedValue(mockPost);
      mockPrisma.blogPost.update.mockResolvedValue({ ...mockPost, viewCount: 1 });

      const req = new Request("http://localhost:3000/api/blog/inspiring-story-1");
      const res = await getGET(req, { params: { slug: "inspiring-story-1" } });
      const json = await res.json() as { slug: string };

      expect(res.status).toBe(200);
      expect(json.slug).toBe("inspiring-story-1");
    });

    it("returns 404 if the post is not found or not published", async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/blog/non-existent");
      const res = await getGET(req, { params: { slug: "non-existent" } });

      expect(res.status).toBe(404);
    });
  });
});
