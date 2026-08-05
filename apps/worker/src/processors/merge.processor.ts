import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { readFile } from 'node:fs/promises';
import { MergeService } from '../services/merge.service';
import { WorkspaceService } from '../services/workspace.service';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import type { JobHandler } from './job-handler.interface';
import type { QueueJobResult } from '../queue/queue.events';
import { payloadOf, saveJson } from './processing.helpers';

@Injectable()
export class MergeProcessor implements JobHandler {
  readonly type = 'merge';
  constructor(
    private readonly merger: MergeService,
    private readonly workspace: WorkspaceService,
    private readonly queue: QueueService,
    private readonly logger: WorkerLoggerService,
  ) {}
  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
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
    await this.queue.enqueueJob(QUEUE_NAMES.file, 'cleanup', payload);
    this.logger.log(`Merge completed pipelineId=${payload.pipelineId}`, 'MergeProcessor');
    return { status: 'completed', queue: job.queueName, jobId: String(job.id), data };
  }
}
