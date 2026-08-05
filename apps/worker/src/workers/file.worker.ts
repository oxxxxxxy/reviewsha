import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { BaseQueueWorker } from './base.worker';
import { ProcessorRegistry } from '../processors/processor.registry';
import type { Job } from 'bullmq';
import type { QueueJobResult } from '../queue/queue.events';

/** Worker skeleton for the architecture-level `file.queue`. */
@Injectable()
export class FileWorker extends BaseQueueWorker implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(WorkerLoggerService) logger: WorkerLoggerService,
    @Inject(QueueService) queueService: QueueService,
    @Optional() @Inject(ProcessorRegistry) processors?: ProcessorRegistry,
  ) {
    super(QUEUE_NAMES.file, logger, configService, queueService, processors);
  }

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  protected override async processJob(job: Job): Promise<QueueJobResult> {
    // Stage 7 emits the historical `extract` job. Expand it at the worker
    // boundary so existing API contracts execute the Stage 8 chain beginning
    // with download without requiring a breaking queue migration.
    if (job.name === 'extract' && this.processors?.get('download')) {
      await this.processors.execute({
        ...job,
        name: 'download',
        id: `${job.id ?? 'job'}:download`,
      } as Job);
    }
    return super.processJob(job);
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
