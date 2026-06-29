// src/app/api/auth/me/route.ts
import { ok, getSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return ok(null);
    }

    // Check if user still exists and is not deleted
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.isDeleted) {
      return ok(null);
    }

    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
    });
  } catch (err) {
    captureError(err, { route: "GET /api/auth/me" });
    return ok(null);
  }
}
