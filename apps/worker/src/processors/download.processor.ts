import { Inject, Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { createHash } from 'node:crypto';
import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { WorkerDatabaseService } from '../database/worker-database.service';
import { ScanStatus } from '@prisma/client';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { WorkerStorageService } from '../storage/worker-storage.service';
import { WorkspaceService } from '../services/workspace.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { JobHandler } from './job-handler.interface';
import type { QueueJobResult } from '../queue/queue.events';
import { payloadOf, saveJson } from './processing.helpers';

@Injectable()
export class DownloadProcessor implements JobHandler {
  readonly type = 'download';
  constructor(
    @Inject(WorkerDatabaseService) private readonly db: WorkerDatabaseService,
    @Inject(WorkerStorageService) private readonly storage: WorkerStorageService,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(QueueService) private readonly queue: QueueService,
    private readonly logger: WorkerLoggerService,
  ) {}

  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    const pipelineId = payload.pipelineId!;
    const paths = await this.workspace.create(pipelineId);
    const upload = await this.db.uploadedFile.findUnique({ where: { id: payload.uploadId } });
    if (!upload || upload.deletedAt) throw new Error(`Upload not found: ${payload.uploadId}`);
    if (upload.projectId !== payload.projectId)
      throw new Error('Upload does not belong to project');
    await this.db.scan.update({
      where: { id: pipelineId },
      data: { status: ScanStatus.EXTRACTING, progress: 5, startedAt: new Date() },
    });
    const archivePath = `${paths.source}/archive.zip`;
    await mkdir(paths.source, { recursive: true });
    const stream = await this.storage.getObject(upload.bucket, upload.objectKey);
    await pipeline(stream, createWriteStream(archivePath));
    const info = await stat(archivePath);
    if (BigInt(info.size) !== upload.size) throw new Error('Downloaded archive size mismatch');
    const checksum = createHash('sha256');
    for await (const chunk of createReadStream(archivePath)) checksum.update(chunk);
    if (checksum.digest('hex') !== upload.checksum.replace(/^sha256:/, ''))
      throw new Error('Downloaded archive checksum mismatch');
    const result = { archivePath, size: info.size, checksum: upload.checksum };
    await saveJson(`${paths.output}/download.json`, result);
    await this.queue.enqueueJob(QUEUE_NAMES.file, 'extract', payload);
    this.logger.log(`Download completed uploadId=${payload.uploadId}`, 'DownloadProcessor');
    return { status: 'completed', queue: job.queueName, jobId: String(job.id), data: result };
  }
}
