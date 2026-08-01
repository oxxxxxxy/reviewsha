import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { BaseQueueWorker } from './base.worker';

/** Worker skeleton for the architecture-level `ai.queue`. */
@Injectable()
export class AIWorker extends BaseQueueWorker implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(WorkerLoggerService) logger: WorkerLoggerService,
    @Inject(QueueService) queueService: QueueService,
  ) {
    super(QUEUE_NAMES.ai, logger, configService, queueService);
  }

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
