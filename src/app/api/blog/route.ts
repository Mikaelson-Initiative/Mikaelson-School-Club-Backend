// src/app/api/blog/route.ts
// GET /api/blog — Public list of published blog posts (paginated & filterable)

export const dynamic = "force-dynamic";

import { ok, serverError } from "@/lib/api-helpers";
import { getPublicPosts } from "@/services/blog.service";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10) || 10));

    const result = await getPublicPosts({
      search,
      category,
      page,
      limit,
    });

    return ok(result);
  } catch (err) {
    captureError(err, { route: "GET /api/blog" });
    return serverError();
  }
}
