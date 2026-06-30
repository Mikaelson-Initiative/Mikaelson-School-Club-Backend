// Temporary route to seed the first admin user in production
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const adminEmail = "happiness@mikaelsoninitiative.org";

    const existing = await prisma.user.findFirst({
      where: { email: adminEmail },
    });

    if (existing) {
      return NextResponse.json({ message: "Admin user already exists." });
    }

    const password = process.env.SEED_ADMIN_PASSWORD || "happiness@123";
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Mikaelson Admin",
        role: "SUPERADMIN",
        provider: "CREDENTIALS",
        passwordHash,
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({ 
      message: "Admin created successfully!", 
      email: adminEmail 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
