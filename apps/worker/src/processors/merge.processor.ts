import { Injectable } from '@nestjs/common';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { BasePipelineProcessor } from './base-pipeline.processor';

@Injectable()
export class MergeProcessor extends BasePipelineProcessor {
  readonly type = 'merge';
  constructor(logger: WorkerLoggerService) {
    super(logger);
  }
}
