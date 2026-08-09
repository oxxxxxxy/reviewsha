import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PipelineStatus, ScanStatus, UploadStatus } from '@prisma/client';
import { Client } from 'minio';
import { createHash, randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { ZipFile } from 'yazl';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplicationContext } from '@nestjs/common';
import { WorkerModule } from '../../src/worker.module';
import { WorkerDatabaseService } from '../../src/database/worker-database.service';
import { QueueService } from '../../src/queue/queue.service';
import { QUEUE_NAMES } from '../../src/queue/queue.constants';
import { WorkspaceService } from '../../src/services/workspace.service';

const enabled = process.env.RUN_WORKER_E2E === 'true';

describe.runIf(enabled)('real Worker pipeline', () => {
  let app: INestApplicationContext;
  let db: WorkerDatabaseService;
  let queue: QueueService;
  let workspace: WorkspaceService;
  let minio: Client;
  const userId = randomUUID();
  const projectId = randomUUID();
  const uploadId = randomUUID();
  const scanId = randomUUID();
  const objectKey = `users/${userId}/projects/${projectId}/uploads/${uploadId}.zip`;

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      WORKER_REDIS_REQUIRED: 'true',
      REDIS_URL: 'redis://localhost:6379',
      DATABASE_URL: 'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
      MINIO_ENDPOINT: 'http://localhost:9000',
      MINIO_ACCESS_KEY: 'reviewsha',
      MINIO_SECRET_KEY: 'reviewsha-password',
      MINIO_PORT: '9000',
      MINIO_USE_SSL: 'false',
      AI_PROVIDER: 'mock',
    });
    app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
    db = app.get(WorkerDatabaseService);
    queue = app.get(QueueService);
    workspace = app.get(WorkspaceService);
    minio = new Client({
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: 'reviewsha',
      secretKey: 'reviewsha-password',
    });

    const archive = await zipBuffer();
    const checksum = createHash('sha256').update(archive).digest('hex');
    await minio.putObject('projects', objectKey, archive, archive.length);
    await db.user.create({
      data: {
        id: userId,
        email: `worker-e2e-${userId}@example.com`,
        passwordHash: 'not-used',
        displayName: 'Worker E2E',
      },
    });
    await db.project.create({ data: { id: projectId, ownerId: userId, name: 'Worker E2E' } });
    await db.uploadedFile.create({
      data: {
        id: uploadId,
        projectId,
        uploadedById: userId,
        objectKey,
        bucket: 'projects',
        filename: 'project.zip',
        size: archive.length,
        mimeType: 'application/zip',
        checksum: `sha256:${checksum}`,
        status: UploadStatus.COMPLETED,
        version: 1,
      },
    });
    await db.scan.create({
      data: {
        id: scanId,
        projectId,
        sourceFileId: uploadId,
        createdById: userId,
        status: ScanStatus.QUEUED,
        pipelineStatus: PipelineStatus.RUNNING,
      },
    });
  }, 30_000);

  afterAll(async () => {
    await minio?.removeObject('projects', objectKey).catch(() => undefined);
    await db?.project.delete({ where: { id: projectId } }).catch(() => undefined);
    await app?.close();
  });

  it('processes Download through Cleanup and persists AI/report data', async () => {
    await queue.enqueueJob(QUEUE_NAMES.file, 'download', {
      pipelineId: scanId,
      projectId,
      uploadId,
    });

    const completed = await waitFor(async () => {
      const scan = await db.scan.findUnique({ where: { id: scanId }, include: { report: true } });
      return scan?.status === ScanStatus.COMPLETED && scan.report ? scan : undefined;
    });
    expect(completed.pipelineStatus).toBe(PipelineStatus.COMPLETED);
    expect(completed.progress).toBe(100);
    expect(completed.report?.status).toBe('READY');
    expect(completed.report?.score).toBe(100);
    expect(await db.aIRequest.count({ where: { scanId } })).toBe(5);
    expect(await db.aIRequest.count({ where: { scanId, status: 'COMPLETED' } })).toBe(5);
    expect(await db.aIResponse.count({ where: { request: { scanId } } })).toBe(5);
    expect(await db.analysisContext.count({ where: { scanId } })).toBe(1);
    expect(
      await db.aIUsage.findUnique({
        where: { scanId_model: { scanId, model: 'deepseek/deepseek-chat' } },
      }),
    ).toMatchObject({
      requestCount: 5,
    });

    await waitFor(async () => {
      try {
        await stat(workspace.path(scanId));
        return undefined;
      } catch {
        return true;
      }
    });
  }, 30_000);
});

async function zipBuffer(): Promise<Buffer> {
  const archive = new ZipFile();
  archive.addBuffer(Buffer.from('{"name":"fixture"}\n'), 'package.json');
  archive.addBuffer(Buffer.from('export const answer = 42;\n'), 'src/index.ts');
  archive.end();
  const chunks: Buffer[] = [];
  for await (const chunk of archive.outputStream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function waitFor<T>(callback: () => Promise<T | undefined>, timeoutMs = 20_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await callback();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition was not met within ${timeoutMs}ms`);
}
