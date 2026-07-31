import { Module } from '@nestjs/common';

import { ShutdownService } from './common/shutdown/shutdown.service';
import { WorkerConfigModule } from './config/config.module';
import { QueueModule } from './queue/queue.module';
import { AnalyzeWorker } from './workers/analyze.worker';
import { CleanupWorker } from './workers/cleanup.worker';
import { ExtractWorker } from './workers/extract.worker';
import { ParseWorker } from './workers/parse.worker';
import { ReportWorker } from './workers/report.worker';
import { UploadWorker } from './workers/upload.worker';

@Module({
  imports: [WorkerConfigModule, QueueModule],
  providers: [
    ShutdownService,
    UploadWorker,
    ExtractWorker,
    ParseWorker,
    AnalyzeWorker,
    ReportWorker,
    CleanupWorker,
  ],
})
export class WorkerModule {}
