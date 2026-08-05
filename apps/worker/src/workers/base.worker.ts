import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';

import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { createRedisConnection } from '../queue/queue.factory';
import {
  formatJobCompletedLog,
  formatJobReceivedLog,
  type QueueJobResult,
} from '../queue/queue.events';
import { QueueService } from '../queue/queue.service';
import { ProcessorRegistry } from '../processors/processor.registry';

/**
 * Base implementation for one BullMQ worker bound to one queue.
 *
 * Concrete workers only declare their queue name. Bootstrapping, Redis guard,
 * processor registration and shutdown stay here so every pipeline stage follows
 * the same operational contract.
 */
export abstract class BaseQueueWorker {
  protected bullWorker?: Worker;

  protected constructor(
    protected readonly queueName: string,
    protected readonly logger: WorkerLoggerService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    protected readonly processors?: ProcessorRegistry,
  ) {}

  /** Starts the BullMQ worker when Redis is available. */
  async start(): Promise<void> {
    if (this.bullWorker) {
      return;
    }

    await this.queueService.initialize();

    if (!this.queueService.isRedisAvailable()) {
      this.logger.warn(
        `${this.constructor.name} skipped: Redis unavailable`,
        this.constructor.name,
      );
      return;
    }

    const redisUrl = this.configService.getOrThrow<string>('worker.redisUrl');
    const connection = createRedisConnection(redisUrl);

    this.bullWorker = new Worker(this.queueName, (job) => this.processJob(job), { connection });
    this.queueService.registerWorker(this.bullWorker);
    this.logger.log(`${this.constructor.name} started`, this.constructor.name);
  }

  /** Closes the underlying BullMQ worker during graceful shutdown. */
  async close(): Promise<void> {
    await this.bullWorker?.close();
    this.bullWorker = undefined;
  }

  /** Minimal stage processor used until domain-specific processors are added. */
  protected async processJob(job: Job): Promise<QueueJobResult> {
    this.logger.log(formatJobReceivedLog(this.queueName, job), this.constructor.name);
    const handler = this.processors?.get(job.name);
    if (handler) return handler.execute(job);
    this.logger.log(formatJobCompletedLog(this.queueName, job), this.constructor.name);

    return {
      status: 'completed',
      queue: this.queueName,
      jobId: job.id ? String(job.id) : undefined,
    };
  }
}
