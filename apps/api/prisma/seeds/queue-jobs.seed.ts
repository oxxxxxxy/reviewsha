import { QueueStatus } from '@prisma/client';
import { seedQueueJobs } from './constants';
import type { SeedContext } from './types';

export async function seedQueueJobsModule(context: SeedContext): Promise<void> {
  for (const queueJobSeed of seedQueueJobs) {
    await context.prisma.queueJob.upsert({
      where: { id: queueJobSeed.id },
      update: {
        projectId: queueJobSeed.projectId,
        scanId: queueJobSeed.scanId,
        type: queueJobSeed.type,
        status: queueJobSeed.status,
        attempts: queueJobSeed.attempts,
        workerId: queueJobSeed.workerId,
        payload: {
          source: 'seed',
          projectId: queueJobSeed.projectId,
          scanId: queueJobSeed.scanId,
        },
        error:
          queueJobSeed.status === QueueStatus.FAILED
            ? 'Seeded failed queue job for retry UI checks.'
            : null,
      },
      create: {
        id: queueJobSeed.id,
        projectId: queueJobSeed.projectId,
        scanId: queueJobSeed.scanId,
        type: queueJobSeed.type,
        status: queueJobSeed.status,
        attempts: queueJobSeed.attempts,
        workerId: queueJobSeed.workerId,
        payload: {
          source: 'seed',
          projectId: queueJobSeed.projectId,
          scanId: queueJobSeed.scanId,
        },
        error:
          queueJobSeed.status === QueueStatus.FAILED
            ? 'Seeded failed queue job for retry UI checks.'
            : null,
        startedAt: queueJobSeed.workerId ? new Date('2026-08-01T00:01:00.000Z') : null,
        finishedAt:
          queueJobSeed.status === QueueStatus.COMPLETED
            ? new Date('2026-08-01T00:12:00.000Z')
            : null,
      },
    });
  }
}
