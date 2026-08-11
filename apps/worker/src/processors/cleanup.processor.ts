import { Inject, Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CleanupService } from '../services/cleanup.service';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import type { JobHandler } from './job-handler.interface';
import type { QueueJobResult } from '../queue/queue.events';
import { payloadOf } from './processing.helpers';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class CleanupProcessor implements JobHandler {
  readonly type = 'cleanup';
  constructor(
    @Inject(CleanupService) private readonly cleanup: CleanupService,
    // Kept injected because all processors share the same operational
    // dependencies; cleanup deliberately does not enqueue another stage.
    @Inject(QueueService) private readonly _queue: QueueService,
    @Inject(WorkerLoggerService) private readonly logger: WorkerLoggerService,
  ) {}
  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    await this.cleanup.cleanupWorkspace(payload.pipelineId!);
    this.logger.log(`Cleanup completed pipelineId=${payload.pipelineId}`, 'CleanupProcessor');
    return {
      status: 'completed',
      queue: job.queueName,
      jobId: String(job.id),
      data: { cleaned: true },
    };
  }
}
