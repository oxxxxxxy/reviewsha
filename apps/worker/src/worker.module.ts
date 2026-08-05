import { Module } from '@nestjs/common';

import { ShutdownService } from './common/shutdown/shutdown.service';
import { WorkerDatabaseService } from './database/worker-database.service';
import { WorkerConfigModule } from './config/config.module';
import { QueueModule } from './queue/queue.module';
import { AIWorker } from './workers/ai.worker';
import { FileWorker } from './workers/file.worker';
import { NotificationWorker } from './workers/notification.worker';
import { ReportWorker } from './workers/report.worker';
import { ScanWorker } from './workers/scan.worker';
import { WorkerStorageService } from './storage/worker-storage.service';
import { CleanupService } from './services/cleanup.service';
import { FilesystemService } from './services/filesystem.service';
import { ProjectReaderService } from './services/project-reader.service';
import { TempStorageService } from './services/temp-storage.service';
import { AnalyzeProcessor } from './processors/analyze.processor';
import { ExtractProcessor } from './processors/extract.processor';
import { MergeProcessor } from './processors/merge.processor';
import { NotifyProcessor } from './processors/notify.processor';
import { ParseProcessor } from './processors/parse.processor';
import { ProcessorRegistry } from './processors/processor.registry';
import { ReportProcessor } from './processors/report.processor';
import { WorkerHealthService } from './health/worker-health.service';

@Module({
  imports: [WorkerConfigModule, QueueModule],
  providers: [
    ShutdownService,
    WorkerDatabaseService,
    WorkerStorageService,
    FilesystemService,
    TempStorageService,
    CleanupService,
    ProjectReaderService,
    ExtractProcessor,
    ParseProcessor,
    AnalyzeProcessor,
    MergeProcessor,
    ReportProcessor,
    NotifyProcessor,
    ProcessorRegistry,
    WorkerHealthService,
    ScanWorker,
    FileWorker,
    AIWorker,
    ReportWorker,
    NotificationWorker,
  ],
  exports: [WorkerDatabaseService, WorkerStorageService, ProcessorRegistry],
})
export class WorkerModule {}
