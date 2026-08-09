import { Injectable } from '@nestjs/common';
import { FindingCategory, ReportFormat, ReportStatus, ScanStatus, Severity } from '@prisma/client';
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
import { WorkspaceService } from '../services/workspace.service';
import type { JobHandler } from './job-handler.interface';
import { payloadOf, saveJson } from './processing.helpers';

@Injectable()
export class ReportProcessor implements JobHandler {
  readonly type = 'report';

  constructor(
    private readonly db: WorkerDatabaseService,
    private readonly workspace: WorkspaceService,
    private readonly generator: ReportGeneratorService,
    private readonly markdown: MarkdownReportBuilder,
    private readonly json: JsonReportBuilder,
    private readonly queue: QueueService,
    private readonly logger: WorkerLoggerService,
  ) {}

  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    const paths = await this.workspace.create(payload.pipelineId!);
    const aiData = JSON.parse(await readFile(`${paths.output}/ai-results.json`, 'utf8')) as {
      results: AIReviewResult[];
      totalTokens?: number;
    };
    const scan = await this.db.scan.findUnique({ where: { id: payload.pipelineId } });
    if (!scan) throw new Error(`Analysis not found: ${payload.pipelineId}`);
    await this.db.scan.update({
      where: { id: scan.id },
      data: { status: ScanStatus.REPORTING, progress: 85 },
    });

    const generated = this.generator.generate(aiData.results);
    const markdown = this.markdown.build(generated);
    const json = this.json.build(generated);
    await saveJson(`${paths.output}/report.json`, generated);
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(`${paths.output}/report.md`, markdown, 'utf8'),
    );

    const report = await this.db.$transaction(async (database) => {
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
        },
        update: {
          summary: generated.summary,
          score: generated.score,
          filePath: null,
          tokensUsed: aiData.totalTokens ?? 0,
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
      line: issue.line,
      lineStart: issue.line,
      lineEnd: issue.line,
      severity: Severity[issue.severity],
      category: this.category(issue.category),
      title: issue.title.slice(0, 240),
      description: issue.description,
      recommendation: issue.recommendation,
    };
  }

  private category(value: string): FindingCategory {
    const allowed = Object.values(FindingCategory);
    if (allowed.includes(value as FindingCategory)) return value as FindingCategory;
    return FindingCategory.MAINTAINABILITY;
  }
}
