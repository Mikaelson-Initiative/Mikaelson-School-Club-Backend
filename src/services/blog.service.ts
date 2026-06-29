// src/services/blog.service.ts

import { blogRepository }                              from "@/repositories/blog.repository";
import { writeAuditLog }                               from "@/lib/audit";
import { generateSlug, estimateReadingTime }           from "@/lib/api-helpers";
import type { CreatePostInput, UpdatePostInput }       from "@/lib/validators/blog";

interface ActorContext {
  actorId?:    string;
  actorEmail?: string | null;
  ip?:         string | null;
  userAgent?:  string | null;
}

export async function getPublicPosts(options: {
  category?: string;
  search?:   string;
  page:      number;
  limit:     number;
}) {
  const { items, total } = await blogRepository.listPublic(options);
  return {
    posts:       items,
    total,
    page:        options.page,
    limit:       options.limit,
    hasNextPage: (options.page - 1) * options.limit + items.length < total,
  };
}

export async function getPublicPostBySlug(slug: string) {
  const post = await blogRepository.findPublishedBySlug(slug);
  if (!post) return null;

  // Increment view count — fire-and-forget
  blogRepository.incrementViewCount(post.id).catch(() => null);

  return post;
}

export async function listAdminPosts(isPublished?: boolean) {
  return blogRepository.listAdmin(isPublished);
}

export async function createPost(input: CreatePostInput, ctx: ActorContext): Promise<{ success: true; id: string; slug: string }> {
  // Derive unique slug from title
  let slug = generateSlug(input.title);
  const existing = await blogRepository.findBySlug(slug);
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const post = await blogRepository.create({
    ...input,
    slug,
    publishedAt: input.isPublished ? new Date() : null,
    readingTime: estimateReadingTime(input.content),
  });

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "CREATE",
    model:      "BlogPost",
    recordId:   post.id,
    after:      { title: post.title, slug: post.slug, isPublished: post.isPublished },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true, id: post.id, slug: post.slug };
}

export async function updatePost(
  id: string,
  input: UpdatePostInput,
  ctx: ActorContext
): Promise<
  | { success: true; data: Awaited<ReturnType<typeof blogRepository.update>> }
  | { success: false; status: number; error: string }
> {
  const existing = await blogRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Post not found." };

  const nowPublishing = input.isPublished === true && !existing.isPublished;

  const updated = await blogRepository.update(id, {
    ...input,
    ...(input.content   ? { readingTime: estimateReadingTime(input.content) } : {}),
    ...(nowPublishing   ? { publishedAt: new Date() }                         : {}),
  });

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "UPDATE",
    model:      "BlogPost",
    recordId:   id,
    before:     { title: existing.title, isPublished: existing.isPublished },
    after:      { title: updated.title,  isPublished: updated.isPublished  },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true, data: updated };
}

export async function deletePost(
  id: string,
  ctx: ActorContext
): Promise<
  | { success: true }
  | { success: false; status: number; error: string }
> {
  const existing = await blogRepository.findById(id);
  if (!existing) return { success: false, status: 404, error: "Post not found." };

  await blogRepository.softDelete(id);

  await writeAuditLog({
    actorId:    ctx.actorId,
    actorEmail: ctx.actorEmail,
    action:     "DELETE",
    model:      "BlogPost",
    recordId:   id,
    before:     { title: existing.title, slug: existing.slug },
    ip:         ctx.ip,
    userAgent:  ctx.userAgent,
  });

  return { success: true };
}