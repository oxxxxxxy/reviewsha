import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { BaseQueueWorker } from './base.worker';
import { ProcessorRegistry } from '../processors/processor.registry';
import type { Job } from 'bullmq';
import type { QueueJobResult } from '../queue/queue.events';
import { PipelineStateService } from '../services/pipeline-state.service';

/** Worker skeleton for the architecture-level `file.queue`. */
@Injectable()
export class FileWorker extends BaseQueueWorker implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(WorkerLoggerService) logger: WorkerLoggerService,
    @Inject(QueueService) queueService: QueueService,
    @Optional() @Inject(ProcessorRegistry) processors?: ProcessorRegistry,
    @Optional() @Inject(PipelineStateService) pipelineState?: PipelineStateService,
  ) {
    super(QUEUE_NAMES.file, logger, configService, queueService, processors, pipelineState);
  }

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  protected override processJob(job: Job): Promise<QueueJobResult> {
    // The API historically names the first job `extract`. The actual first
    // operation must download the archive. Execute only DownloadProcessor;
    // it enqueues the single real extract job after a successful download.
    const isApiEnvelope = job.data && typeof job.data === 'object' && 'payload' in job.data;
    if (job.name === 'extract' && isApiEnvelope && this.processors?.get('download')) {
      return this.processors.execute({ ...job, name: 'download' } as Job);
    }
    return super.processJob(job);
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
