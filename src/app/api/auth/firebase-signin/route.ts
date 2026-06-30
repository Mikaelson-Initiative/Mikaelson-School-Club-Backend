// src/app/api/auth/firebase-signin/route.ts
import { forbidden } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return forbidden("Firebase authentication is disabled.");
}
