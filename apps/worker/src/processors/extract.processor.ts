import { Injectable, Optional } from '@nestjs/common';
import { ScanStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { ArchiveService } from '../services/archive.service';
import { WorkspaceService } from '../services/workspace.service';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import type { JobHandler } from './job-handler.interface';
import type { QueueJobResult } from '../queue/queue.events';
import { payloadOf, saveJson } from './processing.helpers';
import { WorkerDatabaseService } from '../database/worker-database.service';

@Injectable()
export class ExtractProcessor implements JobHandler {
  readonly type = 'extract';
  constructor(
    private readonly archive: ArchiveService,
    private readonly workspace: WorkspaceService,
    private readonly queue: QueueService,
    private readonly logger: WorkerLoggerService,
    @Optional() private readonly db?: WorkerDatabaseService,
  ) {}
  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    const paths = await this.workspace.create(payload.pipelineId!);
    const result = await this.archive.extract(`${paths.source}/archive.zip`, paths.extracted);
    const data = { sourcePath: paths.extracted, ...result };
    await saveJson(`${paths.output}/extract.json`, data);
    await this.db?.scan.update({
      where: { id: payload.pipelineId },
      data: { status: ScanStatus.PARSING, progress: 25 },
    });
    await this.queue.enqueueJob(QUEUE_NAMES.file, 'parse', payload);
    this.logger.log(`Extract completed pipelineId=${payload.pipelineId}`, 'ExtractProcessor');
    return { status: 'completed', queue: job.queueName, jobId: String(job.id), data };
  }
}
