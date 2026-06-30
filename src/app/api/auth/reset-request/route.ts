// src/app/api/auth/reset-request/route.ts
import { forbidden } from "@/lib/api-helpers";

export async function POST(req: Request) {
  return forbidden("Password reset requests are disabled.");
}