import type { PrismaClient } from '@prisma/client';
import { seedChatsModule } from './chats.seed';
import { seedFindingsModule } from './findings.seed';
import { seedProjectsModule } from './projects.seed';
import { seedQueueJobsModule } from './queue-jobs.seed';
import { seedReportsModule } from './reports.seed';
import { seedScansModule } from './scans.seed';
import type { SeedContext, SeedResult } from './types';
import { seedUploadsModule } from './uploads.seed';
import { seedUsersModule } from './users.seed';

export async function runSeeds(prisma: PrismaClient): Promise<SeedResult> {
  const context: SeedContext = {
    prisma,
    usersByEmail: new Map(),
    uploadedFilesByObjectKey: new Map(),
    reportsByScanId: new Map(),
  };

  await seedUsersModule(context);
  await seedProjectsModule(context);
  await seedUploadsModule(context);
  await seedScansModule(context);
  await seedReportsModule(context);
  await seedFindingsModule(context);
  await seedChatsModule(context);
  await seedQueueJobsModule(context);

  const [users, projects, uploadedFiles, scans, reports, findings, chatMessages, queueJobs] =
    await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.uploadedFile.count(),
      prisma.scan.count(),
      prisma.report.count(),
      prisma.finding.count(),
      prisma.chatMessage.count(),
      prisma.queueJob.count(),
    ]);

  return {
    users,
    projects,
    uploadedFiles,
    scans,
    reports,
    findings,
    chatMessages,
    queueJobs,
  };
}
