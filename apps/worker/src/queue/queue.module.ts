import { Global, Module } from '@nestjs/common';

import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { QueueService } from './queue.service';

@Global()
@Module({
  providers: [WorkerLoggerService, QueueService],
  exports: [WorkerLoggerService, QueueService],
})
export class QueueModule {}
