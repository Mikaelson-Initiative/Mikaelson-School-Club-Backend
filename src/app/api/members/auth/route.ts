import { signIn } from "@/lib/auth";
import { ok, serverError, forbidden, getSession, badRequest } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

export const dynamic = "force-dynamic";

const DEFAULT_STUDENT_EMAIL = "student@mikaelsoninitiative.org";
const DEFAULT_STUDENT_PASSWORD = "student@123";

export async function GET() {
  try {
    const session = await getSession();
    return ok({
      isAuthenticated: !!session?.user,
      currentUser: session?.user ?? null,
      defaultCredentials: {
        email: DEFAULT_STUDENT_EMAIL,
        password: DEFAULT_STUDENT_PASSWORD,
        role: "STUDENT"
      }
    });
  } catch (err: any) {
    console.error("ERROR IN GET /api/members/auth:", err);
    return serverError(err.message ?? "Internal server error.");
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const email = (json.email || DEFAULT_STUDENT_EMAIL).trim().toLowerCase();
    const password = json.password || DEFAULT_STUDENT_PASSWORD;

    // 1. Ensure user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      if (email === DEFAULT_STUDENT_EMAIL) {
        // Create default student
        const passwordHash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 12);
        user = await prisma.user.create({
          data: {
            email: DEFAULT_STUDENT_EMAIL,
            name: "Mikaelson Student",
            role: "STUDENT",
            provider: "CREDENTIALS",
            passwordHash,
            emailVerified: new Date(),
            accountStatus: "ACTIVE",
          },
        });
      } else {
        return badRequest("User does not exist and cannot be auto-seeded because it is not the default email.");
      }
    }

    // 2. Validate role
    if (user.role !== "STUDENT" && user.role !== "CHAMPION") {
      return forbidden("Access denied: User is not a STUDENT or CHAMPION.");
    }

    // 3. Perform login
    try {
      await signIn("credentials", { email, password, redirect: false });
      return ok({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        const message = err.cause?.err?.message ?? err.message ?? "Authentication failed.";
        return badRequest(message);
      }
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        return ok({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        });
      }
      throw err;
    }
  } catch (err: any) {
    console.error("ERROR IN POST /api/members/auth:", err);
    return serverError(err.message ?? "Internal server error.");
  }
}
