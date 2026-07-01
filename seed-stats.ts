import { prisma } from './src/lib/prisma.js';

async function main() {
  await prisma.platformStat.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      totalSchools: 9,
      activeChapters: 12,
      totalStudents: 480,
      retentionRate: 94
    }
  });
  console.log('Platform stats initialized');
}

main().catch(console.error).finally(() => prisma.$disconnect());
