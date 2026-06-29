import { prisma } from "@/lib/prisma";

export interface CreatePostData {
  slug:             string;
  category:         string;
  title:            string;
  author:           string;
  excerpt:          string;
  content:          string;
  imageUrl?:        string | null;
  isPublished?:     boolean;
  publishedAt?:     Date | null;
  readingTime:      number;
  metaTitle?:       string | null;
  metaDescription?: string | null;
}

export type UpdatePostData = Partial<CreatePostData>;

export interface ListPostsOptions {
  category?: string;
  search?:   string;
  page:      number;
  limit:     number;
}

export const blogRepository = {
  async create(data: CreatePostData) {
    return prisma.blogPost.create({ data });
  },

  async findById(id: string) {
    return prisma.blogPost.findFirst({ where: { id } });
  },

  async findBySlug(slug: string) {
    return prisma.blogPost.findFirst({ where: { slug } });
  },

  async findPublishedBySlug(slug: string) {
    return prisma.blogPost.findFirst({ where: { slug, isPublished: true } });
  },

  async listPublic({ category, search, page, limit }: ListPostsOptions) {
    const where = {
      isPublished: true,
      ...(category ? { category } : {}),
      ...(search   ? {
        OR: [
          { title:   { contains: search, mode: "insensitive" as const } },
          { excerpt: { contains: search, mode: "insensitive" as const } },
          { author:  { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: {
          id: true, slug: true, category: true, title: true,
          author: true, excerpt: true, imageUrl: true,
          publishedAt: true, readingTime: true, viewCount: true,
        },
        orderBy: { publishedAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return { items, total };
  },

  async listAdmin(isPublished?: boolean) {
    return prisma.blogPost.findMany({
      where:   isPublished !== undefined ? { isPublished } : {},
      orderBy: { createdAt: "desc" },
    });
  },

  async update(id: string, data: UpdatePostData) {
    return prisma.blogPost.update({ where: { id }, data });
  },

  async incrementViewCount(id: string) {
    return prisma.blogPost.update({
      where: { id },
      data:  { viewCount: { increment: 1 } },
    });
  },

  async softDelete(id: string) {
    return prisma.blogPost.delete({ where: { id } });
  },

  async countAll()       { return prisma.blogPost.count(); },
  async countPublished() { return prisma.blogPost.count({ where: { isPublished: true } }); },
};
// Trigger TypeScript cache refresh