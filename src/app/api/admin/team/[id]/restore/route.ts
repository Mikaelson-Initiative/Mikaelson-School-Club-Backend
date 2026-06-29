// src/app/api/admin/team/[id]/restore/route.ts
// POST /api/admin/team/[id]/restore — SUPERADMIN only, 30-day restore window

import { handleRestore } from "@/lib/restore";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return handleRestore(req, "TeamMember", params.id);
}