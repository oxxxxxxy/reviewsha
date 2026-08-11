import { Inject, Injectable } from '@nestjs/common';
import { NotificationType, PipelineStatus, ReportStatus, ScanStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { WorkerDatabaseService } from '../database/worker-database.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { payloadOf } from '../processors/processing.helpers';

@Injectable()
export class PipelineStateService {
  private readonly db: WorkerDatabaseService;
  private readonly queue: QueueService;
  private readonly logger: WorkerLoggerService;

  constructor(
    @Inject(WorkerDatabaseService) db: WorkerDatabaseService,
    @Inject(QueueService) queue: QueueService,
    @Inject(WorkerLoggerService) logger: WorkerLoggerService,
  ) {
    this.db = db;
    this.queue = queue;
    this.logger = logger;
  }

  async fail(job: Job, error: Error): Promise<void> {
    if (job.name === 'cleanup') return;
    const configuredAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
    if (job.attemptsMade < configuredAttempts) return;
    let payload: ReturnType<typeof payloadOf>;
    try {
      payload = payloadOf(job);
    } catch {
      return;
    }
    if (!payload.pipelineId) return;
    const scan = await this.db.scan
      .update({
        where: { id: payload.pipelineId },
        data: {
          status: ScanStatus.FAILED,
          pipelineStatus: PipelineStatus.FAILED,
          pipelineErrorCode: this.errorCode(job.name, error),
          pipelineErrorMessage: error.message,
          pipelineErrorStack: error.stack,
          pipelineErrorAt: new Date(),
          pipelineFinishedAt: new Date(),
          finishedAt: new Date(),
          pipelineAttempts: job.attemptsMade,
        },
        select: { createdById: true },
      })
      .catch((databaseError: unknown) => {
        this.logger.error(
          `Unable to persist pipeline failure: ${databaseError instanceof Error ? databaseError.message : 'unknown'}`,
          undefined,
          'PipelineStateService',
        );
        return null;
      });
    if (job.name === 'report') {
      await this.db.report
        .upsert({
          where: { scanId: payload.pipelineId },
          create: {
            scanId: payload.pipelineId,
            projectId: payload.projectId,
            status: ReportStatus.FAILED,
            summary: error.message,
          },
          update: { status: ReportStatus.FAILED, summary: error.message },
        })
        .catch(() => undefined);
    }
    if (scan?.createdById) {
      const message = `Analysis ${payload.pipelineId} failed at ${job.name}: ${error.message}`;
      const existing = await this.db.notification.findFirst({
        where: { userId: scan.createdById, type: NotificationType.SCAN_FAILED, message },
        select: { id: true },
      });
      if (!existing) {
        await this.db.notification
          .create({
            data: { userId: scan.createdById, type: NotificationType.SCAN_FAILED, message },
          })
          .catch(() => undefined);
      }
    }
    await this.queue
      .enqueueJob(QUEUE_NAMES.deadLetter, 'pipeline.dead-letter', {
        ...payload,
        stage: job.name,
        attempts: job.attemptsMade,
        errorCode: this.errorCode(job.name, error),
        errorMessage: error.message,
        failedAt: new Date().toISOString(),
      })
      .catch(() => undefined);
    await this.queue.enqueueJob(QUEUE_NAMES.file, 'cleanup', payload).catch(() => undefined);
  }

  private errorCode(stage: string, error: Error): string {
    if (/timeout|abort/iu.test(`${error.name} ${error.message}`))
      return `${stage.toUpperCase()}_TIMEOUT`;
    return `${stage.toUpperCase()}_FAILED`;
  }
}
