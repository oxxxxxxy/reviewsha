import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import type { QueueJobResult } from '../queue/queue.events';
import type { JobHandler } from './job-handler.interface';

@Injectable()
export abstract class BasePipelineProcessor implements JobHandler {
  abstract readonly type: string;

  protected constructor(protected readonly logger: WorkerLoggerService) {}

  async execute(job: Job): Promise<QueueJobResult> {
    if (!job.data || typeof job.data !== 'object')
      throw new Error(`${this.type} payload is required`);
    const startedAt = Date.now();
    this.logger.log(`Job started id=${job.id ?? 'unknown'} type=${this.type}`, this.type);
    this.logger.log(
      `Job completed id=${job.id ?? 'unknown'} durationMs=${Date.now() - startedAt}`,
      this.type,
    );
    return {
      status: 'completed',
      queue: job.queueName,
      jobId: job.id ? String(job.id) : undefined,
    };
  }
}
