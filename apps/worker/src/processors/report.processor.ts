import { Inject, Injectable } from '@nestjs/common';
import {
  FindingCategory,
  PipelineStep,
  ReportFormat,
  ReportStatus,
  ScanStatus,
  Severity,
} from '@prisma/client';
import type { Job } from 'bullmq';
import { readFile } from 'node:fs/promises';
import type { AIReviewResult } from '../ai/types/ai.types';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { WorkerDatabaseService } from '../database/worker-database.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueJobResult } from '../queue/queue.events';
import { QueueService } from '../queue/queue.service';
import { JsonReportBuilder } from '../reporting/builders/json.builder';
import { MarkdownReportBuilder } from '../reporting/builders/markdown.builder';
import { ReportGeneratorService } from '../reporting/services/report-generator.service';
import type { ReportIssue } from '../reporting/types/report.types';
import type { AnalysisReport } from '../reporting/types/report.types';
import { WorkspaceService } from '../services/workspace.service';
import type { JobHandler } from './job-handler.interface';
import { assertPipelineActive, payloadOf, saveJson } from './processing.helpers';

@Injectable()
export class ReportProcessor implements JobHandler {
  readonly type = 'report';

  constructor(
    @Inject(WorkerDatabaseService) private readonly db: WorkerDatabaseService,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(ReportGeneratorService) private readonly generator: ReportGeneratorService,
    @Inject(MarkdownReportBuilder) private readonly markdown: MarkdownReportBuilder,
    @Inject(JsonReportBuilder) private readonly json: JsonReportBuilder,
    @Inject(QueueService) private readonly queue: QueueService,
    @Inject(WorkerLoggerService) private readonly logger: WorkerLoggerService,
  ) {}

  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    await assertPipelineActive(this.db, payload.pipelineId);
    const paths = await this.workspace.create(payload.pipelineId!);
    const aiData = JSON.parse(await readFile(`${paths.output}/ai-results.json`, 'utf8')) as {
      results: AIReviewResult[];
      totalTokens?: number;
      fileReviews?: AnalysisReport['fileReviews'];
    };
    const scan = await this.db.scan.findUnique({ where: { id: payload.pipelineId } });
    if (!scan) throw new Error(`Analysis not found: ${payload.pipelineId}`);
    await assertPipelineActive(this.db, scan.id);
    await this.db.scan.update({
      where: { id: scan.id },
      data: { status: ScanStatus.REPORTING, pipelineStep: PipelineStep.REPORT, progress: 85 },
    });

    const generated = this.generator.generate(aiData.results, aiData.fileReviews ?? []);
    const markdown = this.markdown.build(generated);
    const json = this.json.build(generated);
    await saveJson(`${paths.output}/report.json`, generated);
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(`${paths.output}/report.md`, markdown, 'utf8'),
    );

    const report = await this.db.$transaction(async (database) => {
      const current = await database.scan.findUnique({
        where: { id: scan.id },
        select: { status: true },
      });
      if (current?.status === ScanStatus.CANCELLED) throw new Error('PIPELINE_CANCELLED');
      const saved = await database.report.upsert({
        where: { scanId: scan.id },
        create: {
          scanId: scan.id,
          projectId: payload.projectId,
          summary: generated.summary,
          score: generated.score,
          format: ReportFormat.MD,
          status: ReportStatus.READY,
          filePath: null,
          tokensUsed: aiData.totalTokens ?? 0,
          fileReviews:
            generated.fileReviews as unknown as import('@prisma/client').Prisma.InputJsonValue,
        },
        update: {
          summary: generated.summary,
          score: generated.score,
          filePath: null,
          tokensUsed: aiData.totalTokens ?? 0,
          fileReviews:
            generated.fileReviews as unknown as import('@prisma/client').Prisma.InputJsonValue,
          status: ReportStatus.READY,
          deletedAt: null,
        },
      });
      await database.finding.deleteMany({ where: { scanId: scan.id } });
      if (generated.issues.length) {
        await database.finding.createMany({
          data: generated.issues.map((issue) => this.finding(scan.id, saved.id, issue)),
        });
      }
      return saved;
    });

    // A user may cancel while the report transaction is finishing. Never
    // publish a notification for a cancelled pipeline.
    await assertPipelineActive(this.db, scan.id);

    await this.queue.enqueueJob(QUEUE_NAMES.notification, 'notify', {
      ...payload,
      reportId: report.id,
    });
    this.logger.log(
      `Report completed pipelineId=${scan.id} reportId=${report.id} issues=${generated.issues.length}`,
      'ReportProcessor',
    );
    return {
      status: 'completed',
      queue: job.queueName,
      jobId: String(job.id),
      data: { reportId: report.id, markdown, json },
    };
  }

  private finding(scanId: string, reportId: string, issue: ReportIssue) {
    return {
      scanId,
      reportId,
      filePath: issue.filePath,
      line: issue.lineStart ?? issue.line,
      lineStart: issue.lineStart ?? issue.line,
      lineEnd: issue.lineEnd ?? issue.lineStart ?? issue.line,
      severity: Severity[issue.severity],
      category: this.category(issue.category),
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation,
      suggestedPatch: issue.suggestedPatch
        ? (issue.suggestedPatch as unknown as import('@prisma/client').Prisma.InputJsonValue)
        : undefined,
    };
  }

  private category(value: string): FindingCategory {
    const allowed = Object.values(FindingCategory);
    if (allowed.includes(value as FindingCategory)) return value as FindingCategory;
    return FindingCategory.MAINTAINABILITY;
  }
}
