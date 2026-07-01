import { ok } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const email = "admin@mikaelsoninitiative.org";
    const password = "Password123!";
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: "SUPERADMIN",
        provider: "CREDENTIALS",
        isDeleted: false,
        emailVerified: new Date(),
        accountStatus: "ACTIVE",
      },
      create: {
        email,
        name: "System Admin",
        passwordHash,
        role: "SUPERADMIN",
        provider: "CREDENTIALS",
        emailVerified: new Date(),
        accountStatus: "ACTIVE",
      },
    });

    return ok({ message: "Admin seeded", email: user.email });
  } catch (err: any) {
    return new Response(err.message + "\n\n" + err.stack, { status: 500 });
  }
}
