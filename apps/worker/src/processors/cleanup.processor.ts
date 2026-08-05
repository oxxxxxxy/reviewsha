import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CleanupService } from '../services/cleanup.service';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import type { JobHandler } from './job-handler.interface';
import type { QueueJobResult } from '../queue/queue.events';
import { payloadOf } from './processing.helpers';

@Injectable()
export class CleanupProcessor implements JobHandler {
  readonly type = 'cleanup';
  constructor(
    private readonly cleanup: CleanupService,
    private readonly logger: WorkerLoggerService,
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
