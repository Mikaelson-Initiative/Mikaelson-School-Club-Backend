import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'admin@mikaelsoninitiative.org';
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPERADMIN',
      provider: 'CREDENTIALS',
      isDeleted: false,
      emailVerified: new Date(),
      accountStatus: 'ACTIVE',
    },
    create: {
      email,
      name: 'System Admin',
      passwordHash,
      role: 'SUPERADMIN',
      provider: 'CREDENTIALS',
      emailVerified: new Date(),
      accountStatus: 'ACTIVE',
    },
  });

  console.log('Admin user seeded/updated:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
