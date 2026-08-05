import { Injectable } from '@nestjs/common';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { BasePipelineProcessor } from './base-pipeline.processor';

@Injectable()
export class ReportProcessor extends BasePipelineProcessor {
  readonly type = 'report';
  constructor(logger: WorkerLoggerService) {
    super(logger);
  }
}
