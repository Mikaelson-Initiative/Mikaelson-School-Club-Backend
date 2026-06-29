// src/app/api/blog/[slug]/route.ts
// GET /api/blog/[slug] — Public retrieval of a single published blog post by slug

import { ok, notFound, serverError } from "@/lib/api-helpers";
import { getPublicPostBySlug } from "@/services/blog.service";
import { captureError } from "@/lib/sentry";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const post = await getPublicPostBySlug(params.slug);
    if (!post) {
      return notFound("Post not found.");
    }
    return ok(post);
  } catch (err) {
    captureError(err, { route: "GET /api/blog/[slug]" });
    return serverError();
  }
}
