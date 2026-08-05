import { Injectable } from '@nestjs/common';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { BasePipelineProcessor } from './base-pipeline.processor';

@Injectable()
export class ExtractProcessor extends BasePipelineProcessor {
  readonly type = 'extract';
  constructor(logger: WorkerLoggerService) {
    super(logger);
  }
}
