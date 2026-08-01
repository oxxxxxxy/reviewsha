import { Module } from '@nestjs/common';

import { ShutdownService } from './common/shutdown/shutdown.service';
import { WorkerConfigModule } from './config/config.module';
import { QueueModule } from './queue/queue.module';
import { AIWorker } from './workers/ai.worker';
import { FileWorker } from './workers/file.worker';
import { NotificationWorker } from './workers/notification.worker';
import { ReportWorker } from './workers/report.worker';
import { ScanWorker } from './workers/scan.worker';

@Module({
  imports: [WorkerConfigModule, QueueModule],
  providers: [ShutdownService, ScanWorker, FileWorker, AIWorker, ReportWorker, NotificationWorker],
})
export class WorkerModule {}
