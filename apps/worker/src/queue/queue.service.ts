import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Queue, type Worker } from 'bullmq';
import type IORedis from 'ioredis';

import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { QUEUE_NAME_LIST, QUEUE_NAMES, type QueueName } from './queue.constants';
import { createQueue, createRedisConnection, DEFAULT_JOB_OPTIONS } from './queue.factory';

export type EnqueuedJob = {
  queue: QueueName;
  jobName: string;
  jobId?: string;
  disabled: boolean;
};

export type QueuePayload = Record<string, unknown>;

@Injectable()
export class QueueService implements OnModuleDestroy {
  private connection?: IORedis;
  private queues = new Map<QueueName, Queue>();
  private workers: Worker[] = [];
  private initialized = false;
  private initializing?: Promise<void>;
  private redisAvailable = false;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(WorkerLoggerService) private readonly logger: WorkerLoggerService,
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = this.initializeInternal().finally(() => {
      this.initializing = undefined;
    });

    return this.initializing;
  }

  registerWorker(worker: Worker): void {
    this.workers.push(worker);
  }

  getQueueNames(): QueueName[] {
    return [...QUEUE_NAME_LIST];
  }

  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }

  async healthCheck(): Promise<{ redis: 'ok'; queues: Record<string, unknown> }> {
    if (!this.connection || !this.redisAvailable) throw new Error('Redis unavailable');
    await this.connection.ping();
    const counts = await Promise.all(
      [...this.queues.entries()].map(
        async ([name, queue]) => [name, await queue.getJobCounts()] as const,
      ),
    );
    return { redis: 'ok', queues: Object.fromEntries(counts) };
  }

  async enqueueScan(payload: QueuePayload = {}): Promise<EnqueuedJob> {
    return this.enqueue(QUEUE_NAMES.scan, 'scan', payload);
  }

  async enqueueFile(payload: QueuePayload = {}): Promise<EnqueuedJob> {
    return this.enqueue(QUEUE_NAMES.file, 'file', payload);
  }

  async enqueueAI(payload: QueuePayload = {}): Promise<EnqueuedJob> {
    return this.enqueue(QUEUE_NAMES.ai, 'ai', payload);
  }

  async enqueueReport(payload: QueuePayload = {}): Promise<EnqueuedJob> {
    return this.enqueue(QUEUE_NAMES.report, 'report', payload);
  }

  async enqueueNotification(payload: QueuePayload = {}): Promise<EnqueuedJob> {
    return this.enqueue(QUEUE_NAMES.notification, 'notification', payload);
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }
    this.workers = [];

    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();

    if (this.connection) {
      await this.connection.quit().catch(() => this.connection?.disconnect());
      this.connection = undefined;
    }

    this.initialized = false;
    this.initializing = undefined;
    this.redisAvailable = false;
    this.logger.log('Worker resources released', 'QueueService');
  }

  private async initializeInternal(): Promise<void> {
    const redisUrl = this.configService.getOrThrow<string>('worker.redisUrl');
    const redisRequired = this.configService.getOrThrow<boolean>('worker.redisRequired');
    const connection = createRedisConnection(redisUrl, true);

    connection.on('error', () => {
      // Errors are handled by initialize()/BullMQ handlers; this avoids unhandled ioredis events.
    });

    this.connection = connection;

    try {
      await connection.connect();
      await connection.ping();
      this.redisAvailable = true;
      this.logger.log('Redis connected', 'QueueService');
    } catch (error) {
      this.redisAvailable = false;
      const message = error instanceof Error ? error.message : 'Unknown Redis connection error';

      connection.disconnect();
      this.connection = undefined;

      if (redisRequired) {
        this.logger.error(`Redis connection failed: ${message}`, undefined, 'QueueService');
        throw error;
      }

      this.logger.warn(
        `Redis unavailable, worker started in skeleton mode: ${message}`,
        'QueueService',
      );
    }

    if (this.redisAvailable && this.connection) {
      for (const queueName of QUEUE_NAME_LIST) {
        this.queues.set(queueName, createQueue(queueName, this.connection));
      }
    }

    this.initialized = true;
    this.logger.log('Queues initialized', 'QueueService');
  }

  private async enqueue(
    queueName: QueueName,
    jobName: string,
    payload: QueuePayload,
  ): Promise<EnqueuedJob> {
    if (!this.initialized) {
      await this.initialize();
    }

    const queue = this.queues.get(queueName);

    if (!queue) {
      this.logger.warn(
        `Queue ${queueName} is disabled because Redis is unavailable`,
        'QueueService',
      );
      return { queue: queueName, jobName, disabled: true };
    }

    const job = await queue.add(jobName, payload, DEFAULT_JOB_OPTIONS);

    return { queue: queueName, jobName, jobId: String(job.id), disabled: false };
  }
}
