import type { Report } from '@prisma/client';
import { seedReports } from './constants';
import type { SeedContext } from './types';

export async function seedReportsModule(context: SeedContext): Promise<Map<string, Report>> {
  const reportsByScanId = new Map<string, Report>();

  for (const reportSeed of seedReports) {
    const report = await context.prisma.report.upsert({
      where: { scanId: reportSeed.scanId },
      update: {
        projectId: reportSeed.projectId,
        summary: reportSeed.summary,
        score: reportSeed.score,
        tokensUsed: reportSeed.tokensUsed,
        cost: reportSeed.cost,
        filePath: reportSeed.filePath,
      },
      create: {
        scanId: reportSeed.scanId,
        projectId: reportSeed.projectId,
        summary: reportSeed.summary,
        score: reportSeed.score,
        tokensUsed: reportSeed.tokensUsed,
        cost: reportSeed.cost,
        filePath: reportSeed.filePath,
      },
    });

    reportsByScanId.set(report.scanId, report);
  }

  context.reportsByScanId = reportsByScanId;
  return reportsByScanId;
}
