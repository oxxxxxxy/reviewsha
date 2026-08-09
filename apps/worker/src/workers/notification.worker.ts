import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { BaseQueueWorker } from './base.worker';
import { ProcessorRegistry } from '../processors/processor.registry';
import { PipelineStateService } from '../services/pipeline-state.service';

/** Worker skeleton for the architecture-level `notification.queue`. */
@Injectable()
export class NotificationWorker extends BaseQueueWorker implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(WorkerLoggerService) logger: WorkerLoggerService,
    @Inject(QueueService) queueService: QueueService,
    @Optional() @Inject(ProcessorRegistry) processors?: ProcessorRegistry,
    @Optional() @Inject(PipelineStateService) pipelineState?: PipelineStateService,
  ) {
    super(QUEUE_NAMES.notification, logger, configService, queueService, processors, pipelineState);
  }

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
