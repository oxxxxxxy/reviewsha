import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_URLS, QUEUE_NAMES } from '@reviewsha/config';
import { ProjectStatus, QueueStatus, type Project, type QueueJob } from '@reviewsha/types';
import { createReviewshaSDK } from '@reviewsha/sdk';
import { Button } from '@reviewsha/ui';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Stage 2 integration checks', () => {
  it('connects API database layer to PostgreSQL configuration', () => {
    const prismaService = read('apps/api/src/database/prisma.service.ts');
    const envExample = read('apps/api/.env.example');

    expect(prismaService).toContain("getOrThrow<string>('database.url')");
    expect(envExample).toContain(
      'DATABASE_URL=postgresql://reviewsha:reviewsha@localhost:5432/reviewsha',
    );
  });

  it('connects worker queue layer to Redis configuration', () => {
    const queueService = read('apps/worker/src/queue/queue.service.ts');
    const envExample = read('apps/worker/.env.example');

    expect(queueService).toContain("getOrThrow<string>('worker.redisUrl')");
    expect(envExample).toContain('REDIS_URL=redis://localhost:6379');
    expect(QUEUE_NAMES.analyze).toBe('analyze');
  });

  it('allows backend code to consume shared types package', () => {
    const project: Project = {
      id: 'project-id',
      ownerId: 'user-id',
      name: 'Reviewsha',
      tags: [],
      status: ProjectStatus.Active,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    };

    expect(project.name).toBe('Reviewsha');
  });

  it('allows frontend code to use shared SDK defaults', () => {
    const sdk = createReviewshaSDK();

    expect(sdk.client.http.defaults.baseURL).toBe(DEFAULT_URLS.api);
    expect(sdk.projects.list).toBeInstanceOf(Function);
  });

  it('allows admin code to use UI package components and queue types', () => {
    const queueJob: QueueJob = {
      id: 'job-id',
      queue: 'analyze',
      name: 'analyze',
      status: QueueStatus.Waiting,
      payload: {},
      createdAt: '2026-08-01T00:00:00.000Z',
    };

    expect(Button).toBeInstanceOf(Function);
    expect(queueJob.queue).toBe('analyze');
  });
});
