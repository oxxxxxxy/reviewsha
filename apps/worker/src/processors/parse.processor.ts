import { Injectable } from '@nestjs/common';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { BasePipelineProcessor } from './base-pipeline.processor';

@Injectable()
export class ParseProcessor extends BasePipelineProcessor {
  readonly type = 'parse';
  constructor(logger: WorkerLoggerService) {
    super(logger);
  }
}
