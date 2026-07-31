import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { BaseQueueWorker } from './base.worker';

@Injectable()
export class AnalyzeWorker extends BaseQueueWorker implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(WorkerLoggerService) logger: WorkerLoggerService,
    @Inject(QueueService) private readonly queueService: QueueService,
  ) {
    super(QUEUE_NAMES.analyze, logger);
  }

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async start(): Promise<void> {
    if (this.bullWorker) {
      return;
    }

    await this.queueService.initialize();

    if (!this.queueService.isRedisAvailable()) {
      this.logger.warn('AnalyzeWorker skipped: Redis unavailable', this.constructor.name);
      return;
    }

    const redisUrl = this.configService.getOrThrow<string>('worker.redisUrl');
    const connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 500,
    });

    this.bullWorker = new Worker(QUEUE_NAMES.analyze, (job) => this.processJob(job), {
      connection,
    });
    this.queueService.registerWorker(this.bullWorker);
    this.logger.log('AnalyzeWorker started', this.constructor.name);
  }
}
