import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { runSeeds } from './seeds';

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const result = await runSeeds(prisma);

  console.log(
    `Seed completed: users=${result.users}, projects=${result.projects}, uploadedFiles=${result.uploadedFiles}, scans=${result.scans}, reports=${result.reports}, findings=${result.findings}, chatMessages=${result.chatMessages}, queueJobs=${result.queueJobs}`,
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
