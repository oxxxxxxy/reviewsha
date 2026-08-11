import { Inject, Injectable, Optional } from '@nestjs/common';
import { ScanStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { readFile } from 'node:fs/promises';
import { MergeService } from '../services/merge.service';
import { WorkspaceService } from '../services/workspace.service';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import type { JobHandler } from './job-handler.interface';
import type { QueueJobResult } from '../queue/queue.events';
import { assertPipelineActive, payloadOf, saveJson } from './processing.helpers';
import { WorkerDatabaseService } from '../database/worker-database.service';

@Injectable()
export class MergeProcessor implements JobHandler {
  readonly type = 'merge';
  constructor(
    @Inject(MergeService) private readonly merger: MergeService,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(QueueService) private readonly queue: QueueService,
    @Inject(WorkerLoggerService) private readonly logger: WorkerLoggerService,
    @Optional() private readonly db?: WorkerDatabaseService,
  ) {}
  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    await assertPipelineActive(this.db, payload.pipelineId);
    const paths = await this.workspace.create(payload.pipelineId!);
    const [download, extract, parse] = await Promise.all([
      readFile(`${paths.output}/download.json`, 'utf8').then(JSON.parse),
      readFile(`${paths.output}/extract.json`, 'utf8').then(JSON.parse),
      readFile(`${paths.output}/parse.json`, 'utf8').then(JSON.parse),
    ]);
    const data = this.merger.merge({
      projectId: payload.projectId,
      uploadId: payload.uploadId,
      download,
      extract,
      parse,
    });
    await saveJson(`${paths.output}/context.json`, data);
    await assertPipelineActive(this.db, payload.pipelineId);
    await this.db?.scan.update({
      where: { id: payload.pipelineId },
      data: { status: ScanStatus.ANALYZING, progress: 55 },
    });
    await this.queue.enqueueJob(QUEUE_NAMES.ai, 'analyze', payload);
    this.logger.log(`Merge completed pipelineId=${payload.pipelineId}`, 'MergeProcessor');
    return { status: 'completed', queue: job.queueName, jobId: String(job.id), data };
  }
}
