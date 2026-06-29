// src/app/api/auth/firebase-signin/route.ts
import { signIn } from "@/lib/auth";
import { badRequest, ok, serverError } from "@/lib/api-helpers";
import { AuthError } from "next-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const idToken = json.idToken;

    if (!idToken) {
      return badRequest("Firebase ID token is required.");
    }

    try {
      await signIn("firebase", { idToken, redirect: false });
      return ok({ success: true });
    } catch (err) {
      if (err instanceof AuthError) {
        // Return the inner verification error if available
        const message = err.cause?.err?.message ?? err.message ?? "Authentication failed.";
        return badRequest(message);
      }
      // If it throws Next.js internal redirect error, treat as success
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        return ok({ success: true });
      }
      throw err;
    }
  } catch (err: any) {
    console.error("ERROR IN POST /api/auth/firebase-signin:", err);
    return serverError(err.message ?? "Internal server error.");
  }
}
