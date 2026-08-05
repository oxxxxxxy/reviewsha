import { Injectable } from '@nestjs/common';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { BasePipelineProcessor } from './base-pipeline.processor';

@Injectable()
export class NotifyProcessor extends BasePipelineProcessor {
  readonly type = 'notify';
  constructor(logger: WorkerLoggerService) {
    super(logger);
  }
}
