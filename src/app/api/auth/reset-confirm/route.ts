// src/app/api/auth/reset-confirm/route.ts
import { forbidden } from "@/lib/api-helpers";

export async function POST(req: Request) {
  return forbidden("Password reset is disabled.");
}