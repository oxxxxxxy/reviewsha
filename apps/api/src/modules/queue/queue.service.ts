import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, JobsOptions, Queue } from 'bullmq';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import {
  DEFAULT_QUEUE_JOB_OPTIONS,
  type QueueJobData,
  type QueueJobPayload,
  type QueueJobStatus,
  type QueueName,
  QUEUE_NAMES,
} from './queue.constants';
import { buildQueueJob } from './queue.job-builder';
import { QueueEvents, QUEUE_EVENTS } from './queue.events';
import { QueueRegistry } from './queue.registry';

type QueueMap = Record<QueueName, Queue<QueueJobData>>;

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  status: 'HEALTHY' | 'DEGRADED' | 'ERROR';
}

export interface QueueJobSummary {
  id: string;
  name: string;
  state: QueueJobStatus;
  attemptsMade: number;
  createdAt: string;
  processedOn?: string;
  finishedOn?: string;
  failedReason?: string;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues: QueueMap;

  constructor(
    @InjectQueue(QUEUE_NAMES.scan) scan: Queue<QueueJobData>,
    @InjectQueue(QUEUE_NAMES.file) file: Queue<QueueJobData>,
    @InjectQueue(QUEUE_NAMES.ai) ai: Queue<QueueJobData>,
    @InjectQueue(QUEUE_NAMES.chat) chat: Queue<QueueJobData>,
    @InjectQueue(QUEUE_NAMES.report) report: Queue<QueueJobData>,
    @InjectQueue(QUEUE_NAMES.notification) notification: Queue<QueueJobData>,
    @InjectQueue(QUEUE_NAMES.deadLetter) deadLetter: Queue<QueueJobData>,
    private readonly registry: QueueRegistry,
    private readonly events: QueueEvents,
    private readonly logger: ApiLoggerService,
    private readonly config: ConfigService,
  ) {
    this.queues = {
      [QUEUE_NAMES.scan]: scan,
      [QUEUE_NAMES.file]: file,
      [QUEUE_NAMES.ai]: ai,
      [QUEUE_NAMES.chat]: chat,
      [QUEUE_NAMES.report]: report,
      [QUEUE_NAMES.notification]: notification,
      [QUEUE_NAMES.deadLetter]: deadLetter,
    };
  }

  async addJob(
    queueName: QueueName,
    type: string,
    payload: QueueJobPayload = {},
    options: JobsOptions = {},
  ): Promise<{ id: string; queue: QueueName; data: QueueJobData }> {
    const data = buildQueueJob(type, payload);
    const job = await this.queues[queueName].add(type, data, {
      ...DEFAULT_QUEUE_JOB_OPTIONS,
      ...options,
      jobId: data.id,
    });
    this.events.publish(QUEUE_EVENTS.created, { queue: queueName, job: data });
    this.logger.log(`Queue job created: ${queueName}/${data.id}`, 'QueueService');
    return { id: String(job.id), queue: queueName, data };
  }

  getJob(queueName: QueueName, id: string): Promise<Job<QueueJobData> | undefined> {
    return this.queues[queueName].getJob(id);
  }

  async getJobStatus(queueName: QueueName, id: string): Promise<QueueJobStatus | null> {
    const job = await this.getJob(queueName, id);
    return job ? ((await job.getState()) as QueueJobStatus) : null;
  }

  async listJobs(
    queueName: QueueName,
    page = 1,
    limit = 20,
    state?: QueueJobStatus,
  ): Promise<{ items: QueueJobSummary[]; total: number }> {
    const queue = this.queues[queueName];
    const states: QueueJobStatus[] = state
      ? [state]
      : ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'];
    const [jobs, counts] = await Promise.all([
      queue.getJobs(states, (page - 1) * limit, page * limit - 1),
      queue.getJobCounts(...states),
    ]);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const items = await Promise.all(
      jobs.map(async (job) => ({
        id: String(job.id),
        name: job.name,
        state: (await job.getState()) as QueueJobStatus,
        attemptsMade: job.attemptsMade,
        createdAt: new Date(job.timestamp).toISOString(),
        ...(job.processedOn ? { processedOn: new Date(job.processedOn).toISOString() } : {}),
        ...(job.finishedOn ? { finishedOn: new Date(job.finishedOn).toISOString() } : {}),
        ...(job.failedReason ? { failedReason: job.failedReason } : {}),
      })),
    );
    return { items, total };
  }

  async removeJob(queueName: QueueName, id: string): Promise<void> {
    await this.queues[queueName].remove(id);
  }

  async retryJob(queueName: QueueName, id: string): Promise<void> {
    const job = await this.getJob(queueName, id);
    if (!job) throw new Error(`Queue job not found: ${id}`);
    await job.retry('failed');
  }

  pauseQueue(queueName: QueueName): Promise<void> {
    return this.queues[queueName].pause();
  }

  resumeQueue(queueName: QueueName): Promise<void> {
    return this.queues[queueName].resume();
  }

  async healthCheck(): Promise<void> {
    await Promise.all(this.registry.getAll().map((queue) => this.queues[queue].getJobCounts()));
  }

  async getQueueMetrics(queueName: QueueName): Promise<QueueMetrics> {
    const counts = await this.queues[queueName].getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );
    return {
      ...counts,
      status: (counts.failed ?? 0) > 0 ? 'DEGRADED' : 'HEALTHY',
    } as QueueMetrics;
  }

  async getAllQueueMetrics(): Promise<Record<QueueName, QueueMetrics>> {
    const entries = await Promise.all(
      this.registry.getAll().map(async (name) => [name, await this.getQueueMetrics(name)] as const),
    );
    return Object.fromEntries(entries) as Record<QueueName, QueueMetrics>;
  }

  getRedisConfig(): { url: string } {
    return { url: this.config.getOrThrow<string>('redis.url') };
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(Object.values(this.queues).map((queue) => queue.close()));
  }
}
