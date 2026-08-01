import { ScanStepStatus } from '@prisma/client';
import { SEED_FIXED_DATE, seedScanSteps, seedScans } from './constants';
import type { SeedContext } from './types';

export async function seedScansModule(context: SeedContext): Promise<void> {
  for (const scanSeed of seedScans) {
    const sourceFile = context.uploadedFilesByObjectKey.get(scanSeed.sourceObjectKey);
    const createdBy = context.usersByEmail.get(scanSeed.createdByEmail);

    if (!sourceFile) {
      throw new Error(`Seed uploaded file not found: ${scanSeed.sourceObjectKey}`);
    }

    if (!createdBy) {
      throw new Error(`Seed scan creator not found: ${scanSeed.createdByEmail}`);
    }

    await context.prisma.scan.upsert({
      where: { id: scanSeed.id },
      update: {
        projectId: scanSeed.projectId,
        sourceFileId: sourceFile.id,
        createdById: createdBy.id,
        status: scanSeed.status,
        progress: scanSeed.progress,
        startedAt: scanSeed.startedAt,
        finishedAt: scanSeed.finishedAt,
      },
      create: {
        id: scanSeed.id,
        projectId: scanSeed.projectId,
        sourceFileId: sourceFile.id,
        createdById: createdBy.id,
        status: scanSeed.status,
        progress: scanSeed.progress,
        startedAt: scanSeed.startedAt,
        finishedAt: scanSeed.finishedAt,
      },
    });
  }

  for (const [index, scanStepSeed] of seedScanSteps.entries()) {
    await context.prisma.scanStep.upsert({
      where: { scanId_type: { scanId: scanStepSeed.scanId, type: scanStepSeed.type } },
      update: {
        status: scanStepSeed.status,
        error:
          scanStepSeed.status === ScanStepStatus.FAILED
            ? 'Archive extraction failed in seed scenario.'
            : null,
        completedAt:
          scanStepSeed.status === ScanStepStatus.RUNNING
            ? null
            : new Date(SEED_FIXED_DATE.getTime() + index * 60_000),
      },
      create: {
        scanId: scanStepSeed.scanId,
        type: scanStepSeed.type,
        status: scanStepSeed.status,
        error:
          scanStepSeed.status === ScanStepStatus.FAILED
            ? 'Archive extraction failed in seed scenario.'
            : null,
        startedAt: new Date(SEED_FIXED_DATE.getTime() + index * 30_000),
        completedAt:
          scanStepSeed.status === ScanStepStatus.RUNNING
            ? null
            : new Date(SEED_FIXED_DATE.getTime() + index * 60_000),
      },
    });
  }
}
