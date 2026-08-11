import { Inject, Injectable, Optional } from '@nestjs/common';
import { PipelineStep, ScanStatus } from '@prisma/client';
import { copyFile, mkdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { Job } from 'bullmq';
import { ArchiveService } from '../services/archive.service';
import { WorkspaceService } from '../services/workspace.service';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import type { JobHandler } from './job-handler.interface';
import type { QueueJobResult } from '../queue/queue.events';
import { assertPipelineActive, payloadOf, saveJson } from './processing.helpers';
import { WorkerDatabaseService } from '../database/worker-database.service';

@Injectable()
export class ExtractProcessor implements JobHandler {
  readonly type = 'extract';
  constructor(
    @Inject(ArchiveService) private readonly archive: ArchiveService,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(QueueService) private readonly queue: QueueService,
    @Inject(WorkerLoggerService) private readonly logger: WorkerLoggerService,
    @Optional() @Inject(WorkerDatabaseService) private readonly db?: WorkerDatabaseService,
  ) {}
  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    await assertPipelineActive(this.db, payload.pipelineId);
    const paths = await this.workspace.create(payload.pipelineId!);
    const upload = await this.db?.uploadedFile.findUnique({ where: { id: payload.uploadId } });
    if (!upload) throw new Error(`Upload not found: ${payload.uploadId}`);
    const input = join(paths.source, `input${extname(upload.filename).toLowerCase() || '.bin'}`);
    const extension = extname(upload.filename).toLowerCase();
    const archives = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz']);
    let result: { filesCount: number; bytes: number };
    if (archives.has(extension)) {
      result = await this.archive.extract(input, paths.extracted);
    } else {
      await mkdir(paths.extracted, { recursive: true });
      // A standalone source/document is treated as a one-file project. PDF
      // text is extracted so the AI receives readable content instead of
      // binary bytes; office containers are unpacked by 7z when possible.
      if (extension === '.pdf') {
        await this.archive.extractText(
          input,
          join(paths.extracted, `${basename(upload.filename)}.txt`),
        );
      } else if (
        [
          '.doc',
          '.docx',
          '.odt',
          '.rtf',
          '.xls',
          '.xlsx',
          '.ods',
          '.ppt',
          '.pptx',
          '.odp',
        ].includes(extension)
      ) {
        await this.archive.extractOfficeText(input, paths.extracted);
      } else {
        await copyFile(input, join(paths.extracted, basename(upload.filename)));
      }
      result ??= { filesCount: 1, bytes: Number(upload.size) };
    }
    const data = { sourcePath: paths.extracted, ...result };
    await assertPipelineActive(this.db, payload.pipelineId);
    await saveJson(`${paths.output}/extract.json`, data);
    await this.db?.scan.update({
      where: { id: payload.pipelineId },
      data: { status: ScanStatus.PARSING, pipelineStep: PipelineStep.PARSE, progress: 25 },
    });
    await this.queue.enqueueJob(QUEUE_NAMES.file, 'parse', payload);
    this.logger.log(`Extract completed pipelineId=${payload.pipelineId}`, 'ExtractProcessor');
    return { status: 'completed', queue: job.queueName, jobId: String(job.id), data };
  }
}
