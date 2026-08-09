import { Injectable } from '@nestjs/common';
import { NotificationType, PipelineStatus, ScanStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { WorkerDatabaseService } from '../database/worker-database.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import type { QueueJobResult } from '../queue/queue.events';
import { QueueService } from '../queue/queue.service';
import type { JobHandler } from './job-handler.interface';
import { payloadOf } from './processing.helpers';

@Injectable()
export class NotifyProcessor implements JobHandler {
  readonly type = 'notify';

  constructor(
    private readonly db: WorkerDatabaseService,
    private readonly queue: QueueService,
    private readonly logger: WorkerLoggerService,
  ) {}

  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    const scan = await this.db.scan.update({
      where: { id: payload.pipelineId },
      data: {
        status: ScanStatus.COMPLETED,
        progress: 100,
        finishedAt: new Date(),
        pipelineFinishedAt: new Date(),
        pipelineStatus: PipelineStatus.COMPLETED,
      },
      select: { createdById: true },
    });
    await this.db.project.update({
      where: { id: payload.projectId },
      data: { lastAnalysisAt: new Date() },
    });
    if (scan.createdById) {
      const message = `Analysis ${payload.pipelineId} is complete and the report is ready.`;
      const existing = await this.db.notification.findFirst({
        where: { userId: scan.createdById, type: NotificationType.REPORT_READY, message },
        select: { id: true },
      });
      if (!existing) {
        await this.db.notification.create({
          data: { userId: scan.createdById, type: NotificationType.REPORT_READY, message },
        });
      }
    }
    await this.queue.enqueueJob(QUEUE_NAMES.file, 'cleanup', payload);
    this.logger.log(`Analysis completed pipelineId=${payload.pipelineId}`, 'NotifyProcessor');
    return {
      status: 'completed',
      queue: job.queueName,
      jobId: String(job.id),
      data: { notified: true },
    };
  }
}
