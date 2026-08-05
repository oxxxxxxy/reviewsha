import { Injectable } from '@nestjs/common';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { BasePipelineProcessor } from './base-pipeline.processor';

@Injectable()
export class AnalyzeProcessor extends BasePipelineProcessor {
  readonly type = 'analyze';
  constructor(logger: WorkerLoggerService) {
    super(logger);
  }
}
