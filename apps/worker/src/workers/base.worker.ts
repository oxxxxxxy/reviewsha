import type { Job, Worker } from 'bullmq';

import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import {
  formatJobCompletedLog,
  formatJobReceivedLog,
  type QueueJobResult,
} from '../queue/queue.events';

export abstract class BaseQueueWorker {
  protected bullWorker?: Worker;

  protected constructor(
    protected readonly queueName: string,
    protected readonly logger: WorkerLoggerService,
  ) {}

  abstract start(): Promise<void>;

  async close(): Promise<void> {
    await this.bullWorker?.close();
    this.bullWorker = undefined;
  }

  protected async processJob(job: Job): Promise<QueueJobResult> {
    this.logger.log(formatJobReceivedLog(this.queueName, job), this.constructor.name);
    this.logger.log(formatJobCompletedLog(this.queueName, job), this.constructor.name);

    return {
      status: 'completed',
      queue: this.queueName,
      jobId: job.id ? String(job.id) : undefined,
    };
  }
}
