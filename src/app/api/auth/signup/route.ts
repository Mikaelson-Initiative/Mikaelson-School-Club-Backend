// src/app/api/auth/signup/route.ts
import { forbidden } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return forbidden("Registration is disabled.");
}
