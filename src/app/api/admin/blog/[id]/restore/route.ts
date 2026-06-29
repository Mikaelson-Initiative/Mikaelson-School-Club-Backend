// src/app/api/admin/blog/[id]/restore/route.ts
// POST /api/admin/blog/[id]/restore — SUPERADMIN only, 30-day restore window

import { handleRestore } from "@/lib/restore";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return handleRestore(req, "BlogPost", params.id);
}