import { DEFAULT_MODEL, DEFAULT_PROVIDER, seedFindings } from './constants';
import type { SeedContext } from './types';
import { AIRequestStatus } from '@prisma/client';

export async function seedFindingsModule(context: SeedContext): Promise<void> {
  for (const [index, findingSeed] of seedFindings.entries()) {
    const report = context.reportsByScanId.get(findingSeed.reportScanId);
    const sourceFile = context.uploadedFilesByObjectKey.get(findingSeed.sourceObjectKey);

    if (!report) {
      throw new Error(`Seed report not found for scan: ${findingSeed.reportScanId}`);
    }

    if (!sourceFile) {
      throw new Error(`Seed uploaded file not found: ${findingSeed.sourceObjectKey}`);
    }

    const finding = await context.prisma.finding.upsert({
      where: { id: findingSeed.id },
      update: {
        scanId: findingSeed.scanId,
        reportId: report.id,
        fileId: sourceFile.id,
        filePath: findingSeed.filePath,
        line: findingSeed.line,
        column: findingSeed.column,
        lineStart: findingSeed.lineStart,
        lineEnd: findingSeed.lineEnd,
        severity: findingSeed.severity,
        category: findingSeed.category,
        title: findingSeed.title,
        description: findingSeed.description,
        recommendation: findingSeed.recommendation,
      },
      create: {
        id: findingSeed.id,
        scanId: findingSeed.scanId,
        reportId: report.id,
        fileId: sourceFile.id,
        filePath: findingSeed.filePath,
        line: findingSeed.line,
        column: findingSeed.column,
        lineStart: findingSeed.lineStart,
        lineEnd: findingSeed.lineEnd,
        severity: findingSeed.severity,
        category: findingSeed.category,
        title: findingSeed.title,
        description: findingSeed.description,
        recommendation: findingSeed.recommendation,
      },
    });

    await context.prisma.aIRequest.upsert({
      where: { id: `00000000-0000-4000-8000-0000000007${String(index + 1).padStart(2, '0')}` },
      update: {
        scanId: findingSeed.scanId,
        findingId: finding.id,
        provider: DEFAULT_PROVIDER,
        model: DEFAULT_MODEL,
        promptTokens: 700 + index * 11,
        completionTokens: 180 + index * 7,
        totalTokens: 880 + index * 18,
        cost: ((880 + index * 18) * 0.0001).toFixed(6),
        status: AIRequestStatus.COMPLETED,
      },
      create: {
        id: `00000000-0000-4000-8000-0000000007${String(index + 1).padStart(2, '0')}`,
        scanId: findingSeed.scanId,
        findingId: finding.id,
        provider: DEFAULT_PROVIDER,
        model: DEFAULT_MODEL,
        promptTokens: 700 + index * 11,
        completionTokens: 180 + index * 7,
        totalTokens: 880 + index * 18,
        cost: ((880 + index * 18) * 0.0001).toFixed(6),
        status: AIRequestStatus.COMPLETED,
        completedAt: new Date('2026-08-01T00:09:00.000Z'),
      },
    });
  }
}
