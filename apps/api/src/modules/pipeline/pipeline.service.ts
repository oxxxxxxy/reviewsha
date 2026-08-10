import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PipelineStatus,
  PipelineStep as PrismaPipelineStep,
  Role,
  ScanStatus,
} from '@prisma/client';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import type { AuthenticatedUser } from '../../common/auth/types/auth.types';
import { ScanRepository } from '../../repositories/scan/scan.repository';
import { UploadEvents, UPLOAD_EVENTS, type UploadEvent } from '../uploads/events/upload.events';
import { QueueService, type QueueMetrics } from '../queue/queue.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueEvents, QUEUE_EVENTS } from '../queue/queue.events';
import { PIPELINE_EVENTS, PipelineEvents, type PipelineEvent } from './pipeline.events';
import {
  PIPELINE_PROGRESS,
  PIPELINE_QUEUE,
  PIPELINE_RETRY_ATTEMPTS,
  PIPELINE_STEP_ORDER,
  PIPELINE_STEPS,
  RETRYABLE_ERROR_CODES,
  type PipelineStep,
} from './pipeline.constants';

export interface PipelineFailure {
  readonly code?: string;
  readonly message: string;
  readonly stack?: string;
}

export interface PipelineResult {
  readonly resultId?: string;
}

@Injectable()
export class PipelineService {
  constructor(
    @Inject(ScanRepository) private readonly scans: ScanRepository,
    @Inject(QueueService) private readonly queues: QueueService,
    @Inject(UploadEvents) private readonly uploadEvents: UploadEvents,
    @Inject(QueueEvents) private readonly queueEvents: QueueEvents,
    @Inject(PipelineEvents) private readonly events: PipelineEvents,
    @Inject(ApiLoggerService) private readonly logger: ApiLoggerService,
  ) {}

  onModuleInit(): void {
    this.uploadEvents.on(UPLOAD_EVENTS.completed, (event) => {
      void this.startPipeline(event).catch((error: unknown) => {
        this.logger.error(
          `Unable to start pipeline for upload ${event.uploadId}`,
          error instanceof Error ? error.stack : undefined,
          'PipelineService',
        );
      });
    });
    this.queueEvents.on(QUEUE_EVENTS.failed, (event) => {
      const payload = event.job.payload;
      const pipelineId = typeof payload.pipelineId === 'string' ? payload.pipelineId : undefined;
      const step = typeof payload.step === 'string' ? payload.step : undefined;
      if (pipelineId && this.isStep(step)) {
        void this.handleFailure(pipelineId, step, {
          code: 'QUEUE_JOB_FAILED',
          message: event.error ?? 'Queue job failed',
        });
      }
    });
  }

  async startPipeline(event: UploadEvent) {
    const existing = await this.scans.findBySourceFile(event.uploadId);
    if (existing) return existing;

    const scan = await this.scans.create({
      project: { connect: { id: event.projectId } },
      sourceFile: { connect: { id: event.uploadId } },
      ...(event.userId ? { createdBy: { connect: { id: event.userId } } } : {}),
      status: ScanStatus.QUEUED,
      progress: 0,
      pipelineStep: PrismaPipelineStep.EXTRACT,
      pipelineStatus: PipelineStatus.PENDING,
    });

    await this.enqueueStep(scan.id, event.projectId, event.uploadId, PIPELINE_STEPS.extract);
    await this.scans.updateStatus(scan.id, ScanStatus.EXTRACTING);
    await this.scans.update(scan.id, {
      pipelineStatus: PipelineStatus.RUNNING,
      pipelineStartedAt: new Date(),
      pipelineStep: PrismaPipelineStep.EXTRACT,
    });
    this.publish(PIPELINE_EVENTS.started, scan.id, event.projectId, event.uploadId);
    this.logger.log(`Pipeline started: ${scan.id}`, 'PipelineService');
    return this.scans.findById(scan.id);
  }

  async handleSuccess(
    pipelineId: string,
    step: PipelineStep,
    result: PipelineResult = {},
  ): Promise<void> {
    const scan = await this.getScan(pipelineId);
    if (this.isTerminal(scan.status)) return;

    const next = this.nextStep(step);
    this.publish(
      PIPELINE_EVENTS.stepCompleted,
      scan.id,
      scan.projectId,
      scan.sourceFileId ?? '',
      step,
    );
    if (!next) {
      await this.scans.finish(scan.id, ScanStatus.COMPLETED);
      await this.scans.update(scan.id, {
        pipelineStatus: PipelineStatus.COMPLETED,
        pipelineStep: PrismaPipelineStep.NOTIFY,
        pipelineFinishedAt: new Date(),
        pipelineAttempts: { increment: 1 },
      });
      this.publish(
        PIPELINE_EVENTS.completed,
        scan.id,
        scan.projectId,
        scan.sourceFileId ?? '',
        step,
      );
      return;
    }

    await this.enqueueStep(scan.id, scan.projectId, scan.sourceFileId ?? '', next, result.resultId);
    await this.scans.updateProgress(scan.id, PIPELINE_PROGRESS[step]);
    await this.scans.updateStatus(scan.id, this.statusForStep(next));
    await this.scans.update(scan.id, {
      pipelineStatus: PipelineStatus.RUNNING,
      pipelineStep: this.dbStep(next),
      pipelineAttempts: { increment: 1 },
    });
  }

  async handleFailure(
    pipelineId: string,
    step: PipelineStep,
    failure: PipelineFailure,
    attempts = PIPELINE_RETRY_ATTEMPTS,
  ): Promise<{ retriable: boolean }> {
    const scan = await this.getScan(pipelineId);
    const retriable = this.isRetryable(failure) && attempts < PIPELINE_RETRY_ATTEMPTS;
    if (this.isTerminal(scan.status)) return { retriable: false };

    await this.scans.update(scan.id, {
      pipelineStatus: retriable ? PipelineStatus.RUNNING : PipelineStatus.FAILED,
      pipelineStep: this.dbStep(step),
      pipelineErrorCode: failure.code ?? 'PIPELINE_FAILED',
      pipelineErrorMessage: failure.message,
      pipelineErrorStack: failure.stack,
      pipelineErrorAt: new Date(),
      pipelineAttempts: attempts,
      ...(retriable ? {} : { pipelineFinishedAt: new Date() }),
    });
    if (retriable) return { retriable: true };

    await this.scans.updateStatus(scan.id, ScanStatus.FAILED);
    await this.queues.addJob(QUEUE_NAMES.deadLetter, 'pipeline.dead-letter', {
      pipelineId: scan.id,
      projectId: scan.projectId,
      uploadId: scan.sourceFileId ?? '',
      step,
      attempts,
      errorCode: failure.code ?? 'PIPELINE_FAILED',
      errorMessage: failure.message,
    });
    this.publish(
      PIPELINE_EVENTS.failed,
      scan.id,
      scan.projectId,
      scan.sourceFileId ?? '',
      step,
      failure.code,
    );
    this.logger.error(`Pipeline failed: ${scan.id}/${step}`, failure.stack, 'PipelineService');
    return { retriable: false };
  }

  async resumePipeline(pipelineId: string): Promise<void> {
    const scan = await this.getScan(pipelineId);
    const step = this.stepForStatus(scan.status);
    if (!step) throw new Error(`Pipeline ${pipelineId} has no resumable step`);
    await this.scans.updateStatus(scan.id, this.statusForStep(step));
    await this.scans.update(scan.id, {
      pipelineStatus: PipelineStatus.RUNNING,
      pipelineStep: this.dbStep(step),
      pipelineErrorCode: null,
      pipelineErrorMessage: null,
      pipelineErrorStack: null,
      pipelineErrorAt: null,
    });
    await this.enqueueStep(scan.id, scan.projectId, scan.sourceFileId ?? '', step);
  }

  async cancelPipeline(pipelineId: string): Promise<void> {
    const scan = await this.getScan(pipelineId);
    if (!this.isTerminal(scan.status)) {
      await this.scans.updateStatus(scan.id, ScanStatus.CANCELLED);
      await this.scans.update(scan.id, {
        pipelineStatus: PipelineStatus.CANCELLED,
        pipelineFinishedAt: new Date(),
      });
      this.publish(PIPELINE_EVENTS.cancelled, scan.id, scan.projectId, scan.sourceFileId ?? '');
    }
  }

  getProgress(pipelineId: string): Promise<unknown> {
    return this.getScan(pipelineId);
  }

  async getProgressForUser(user: AuthenticatedUser, pipelineId: string) {
    const scan =
      user.role === Role.ADMIN
        ? await this.scans.findById(pipelineId)
        : await this.scans.findByIdForOwner(pipelineId, user.id);
    if (!scan) throw new NotFoundException('Pipeline not found');
    return scan;
  }

  async resumeForUser(user: AuthenticatedUser, pipelineId: string): Promise<void> {
    await this.getProgressForUser(user, pipelineId);
    return this.resumePipeline(pipelineId);
  }

  async cancelForUser(user: AuthenticatedUser, pipelineId: string): Promise<void> {
    await this.getProgressForUser(user, pipelineId);
    return this.cancelPipeline(pipelineId);
  }

  async getMetrics(): Promise<{
    pipeline: Record<PipelineStatus, number>;
    queues: Record<string, QueueMetrics>;
  }> {
    const statuses = Object.values(PipelineStatus);
    const counts = await Promise.all(
      statuses.map((status) => this.scans.countByPipelineStatus(status)),
    );
    return {
      pipeline: Object.fromEntries(
        statuses.map((status, index) => [status, counts[index] ?? 0]),
      ) as Record<PipelineStatus, number>,
      queues: await this.queues.getAllQueueMetrics(),
    };
  }

  isRetryable(failure: PipelineFailure): boolean {
    return Boolean(failure.code && RETRYABLE_ERROR_CODES.has(failure.code));
  }

  private async enqueueStep(
    pipelineId: string,
    projectId: string,
    uploadId: string,
    step: PipelineStep,
    resultId?: string,
  ): Promise<void> {
    await this.queues.addJob(PIPELINE_QUEUE[step], step, {
      pipelineId,
      projectId,
      uploadId,
      step,
      ...(resultId ? { resultId } : {}),
    });
  }

  private async getScan(id: string) {
    const scan = await this.scans.findById(id);
    if (!scan) throw new NotFoundException('Pipeline not found');
    return scan;
  }

  private nextStep(step: PipelineStep): PipelineStep | undefined {
    const index = PIPELINE_STEP_ORDER.indexOf(step);
    return PIPELINE_STEP_ORDER[index + 1];
  }

  private statusForStep(step: PipelineStep): ScanStatus {
    return {
      extract: ScanStatus.EXTRACTING,
      parse: ScanStatus.PARSING,
      analyze: ScanStatus.ANALYZING,
      merge: ScanStatus.AGGREGATING,
      report: ScanStatus.REPORTING,
      notify: ScanStatus.REPORTING,
    }[step];
  }

  private dbStep(step: PipelineStep): PrismaPipelineStep {
    return {
      extract: PrismaPipelineStep.EXTRACT,
      parse: PrismaPipelineStep.PARSE,
      analyze: PrismaPipelineStep.ANALYZE,
      merge: PrismaPipelineStep.MERGE,
      report: PrismaPipelineStep.REPORT,
      notify: PrismaPipelineStep.NOTIFY,
    }[step];
  }

  private stepForStatus(status: ScanStatus): PipelineStep | undefined {
    const steps: Partial<Record<ScanStatus, PipelineStep>> = {
      [ScanStatus.CREATED]: PIPELINE_STEPS.extract,
      [ScanStatus.QUEUED]: PIPELINE_STEPS.extract,
      [ScanStatus.EXTRACTING]: PIPELINE_STEPS.extract,
      [ScanStatus.PARSING]: PIPELINE_STEPS.parse,
      [ScanStatus.ANALYZING]: PIPELINE_STEPS.analyze,
      [ScanStatus.AGGREGATING]: PIPELINE_STEPS.merge,
      [ScanStatus.REPORTING]: PIPELINE_STEPS.report,
    };
    return steps[status];
  }

  private isTerminal(status: ScanStatus): boolean {
    return (
      status === ScanStatus.COMPLETED ||
      status === ScanStatus.FAILED ||
      status === ScanStatus.CANCELLED
    );
  }

  private isStep(value: string | undefined): value is PipelineStep {
    return Boolean(value && Object.values(PIPELINE_STEPS).includes(value as PipelineStep));
  }

  private publish(
    type: string,
    pipelineId: string,
    projectId: string,
    uploadId: string,
    step?: PipelineStep,
    errorCode?: string,
  ): void {
    const event: PipelineEvent = {
      pipelineId,
      projectId,
      uploadId,
      step,
      errorCode,
      occurredAt: new Date().toISOString(),
    };
    this.events.publish(type, event);
  }
}
