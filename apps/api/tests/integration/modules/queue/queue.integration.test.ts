import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { QUEUE_NAMES } from '../../../../src/modules/queue/queue.constants';

const runIntegration = process.env.RUN_STAGE7_INTEGRATION === 'true';
const connection = { host: process.env.REDIS_HOST ?? 'localhost', port: 6379 };
const queue = new Queue(QUEUE_NAMES.scan, { connection });

describe.skipIf(!runIntegration)('BullMQ and Redis integration', () => {
  beforeAll(async () => {
    await queue.getJobCounts();
  });

  afterAll(async () => {
    await queue.close();
  });

  it('connects to Redis', async () => {
    await expect(queue.getJobCounts()).resolves.toBeDefined();
  });

  it('creates a job in the configured queue', async () => {
    const job = await queue.add('integration', { type: 'integration', projectId: 'p1' });
    expect(job.queueName).toBe(QUEUE_NAMES.scan);
    await job.remove();
  });

  it('stores identifier-only payloads', async () => {
    const job = await queue.add('payload', { uploadId: 'u1', projectId: 'p1' });
    expect((await queue.getJob(job.id!))?.data).toEqual({ uploadId: 'u1', projectId: 'p1' });
    await job.remove();
  });

  it('reports waiting state before a worker claims a job', async () => {
    const job = await queue.add('state', { projectId: 'p1' });
    await expect(job.getState()).resolves.toBe('waiting');
    await job.remove();
  });

  it('returns job counts', async () => {
    await expect(queue.getJobCounts()).resolves.toBeDefined();
  });

  it('finds a job by id', async () => {
    const job = await queue.add('lookup', { projectId: 'p1' });
    await expect(queue.getJob(job.id!)).resolves.toBeDefined();
    await job.remove();
  });

  it('removes a job', async () => {
    const job = await queue.add('remove', { projectId: 'p1' });
    await job.remove();
    await expect(queue.getJob(job.id!)).resolves.toBeUndefined();
  });

  it('pauses and resumes the queue', async () => {
    await queue.pause();
    await expect(queue.isPaused()).resolves.toBe(true);
    await queue.resume();
    await expect(queue.isPaused()).resolves.toBe(false);
  });

  it('exposes the configured queue name', () => {
    expect(queue.name).toBe('scan.queue');
  });

  it('keeps jobs isolated by queue name', async () => {
    const other = new Queue(QUEUE_NAMES.report, { connection });
    const job = await other.add('isolated', { reportId: 'r1' });
    expect(job.queueName).toBe(QUEUE_NAMES.report);
    await job.remove();
    await other.close();
  });

  it('supports delayed jobs', async () => {
    const job = await queue.add('delayed', { projectId: 'p1' }, { delay: 1000 });
    await expect(job.getState()).resolves.toBe('delayed');
    await job.remove();
  });
});
