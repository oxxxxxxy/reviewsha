import { Injectable, Optional } from '@nestjs/common';
import { ScanStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { ParserService } from '../services/parser.service';
import { WorkspaceService } from '../services/workspace.service';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import type { JobHandler } from './job-handler.interface';
import type { QueueJobResult } from '../queue/queue.events';
import { payloadOf, saveJson } from './processing.helpers';
import { WorkerDatabaseService } from '../database/worker-database.service';

@Injectable()
export class ParseProcessor implements JobHandler {
  readonly type = 'parse';
  constructor(
    private readonly parser: ParserService,
    private readonly workspace: WorkspaceService,
    private readonly queue: QueueService,
    private readonly logger: WorkerLoggerService,
    @Optional() private readonly db?: WorkerDatabaseService,
  ) {}
  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    const paths = await this.workspace.create(payload.pipelineId!);
    const data = await this.parser.parse(paths.extracted);
    await saveJson(`${paths.output}/parse.json`, data);
    await this.db?.scan.update({
      where: { id: payload.pipelineId },
      data: { status: ScanStatus.AGGREGATING, progress: 45 },
    });
    await this.queue.enqueueJob(QUEUE_NAMES.file, 'merge', payload);
    this.logger.log(`Parse completed files=${data.files.length}`, 'ParseProcessor');
    return { status: 'completed', queue: job.queueName, jobId: String(job.id), data };
  }
}
