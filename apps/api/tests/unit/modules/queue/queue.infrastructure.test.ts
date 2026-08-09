import { describe, expect, it, vi } from 'vitest';
import { QueueService } from '../../../../src/modules/queue/queue.service';
import { QueueRegistry } from '../../../../src/modules/queue/queue.registry';
import { QueueEvents } from '../../../../src/modules/queue/queue.events';
import { buildQueueJob } from '../../../../src/modules/queue/queue.job-builder';
import {
  DEFAULT_QUEUE_JOB_OPTIONS,
  QUEUE_NAMES,
} from '../../../../src/modules/queue/queue.constants';

function setup() {
  const makeQueue = () => ({
    add: vi.fn(async (_name: string, data: { id: string }) => ({ id: data.id })),
    getJob: vi.fn(),
    remove: vi.fn(async () => 1),
    pause: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
    getJobCounts: vi.fn(async () => ({ waiting: 0 })),
    close: vi.fn(async () => undefined),
  });
  const queues = [
    makeQueue(),
    makeQueue(),
    makeQueue(),
    makeQueue(),
    makeQueue(),
    makeQueue(),
    makeQueue(),
  ];
  const logger = { log: vi.fn() };
  const config = { getOrThrow: vi.fn(() => 'redis://localhost:6379') };
  const service = new QueueService(
    queues[0] as never,
    queues[1] as never,
    queues[2] as never,
    queues[3] as never,
    queues[4] as never,
    queues[5] as never,
    queues[6] as never,
    new QueueRegistry(),
    new QueueEvents(),
    logger as never,
    config as never,
  );
  return { service, queues, logger };
}

describe('Queue infrastructure', () => {
  it('keeps the architecture queue registry centralized', () => {
    expect(new QueueRegistry().getAll()).toEqual([
      'scan.queue',
      'file.queue',
      'ai.queue',
      'chat.queue',
      'report.queue',
      'notification.queue',
      'dead-letter.queue',
    ]);
  });

  it('resolves queue names by key', () => {
    expect(new QueueRegistry().get('scan')).toBe(QUEUE_NAMES.scan);
  });

  it('builds a deterministic JSON-safe job envelope', () => {
    expect(buildQueueJob('analysis', { uploadId: 'u1' })).toMatchObject({
      type: 'analysis',
      payload: { uploadId: 'u1' },
    });
  });

  it('rejects empty job types', () => {
    expect(() => buildQueueJob('  ')).toThrow('type is required');
  });

  it('rejects binary payloads', () => {
    expect(() => buildQueueJob('analysis', { file: Buffer.from('x') })).toThrow('JSON-safe');
  });

  it('rejects secret payloads', () => {
    expect(() => buildQueueJob('analysis', { token: 'secret' })).toThrow('secret');
  });

  it('uses the shared retry policy', () => {
    expect(DEFAULT_QUEUE_JOB_OPTIONS).toMatchObject({
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
    });
  });

  it('adds a job to the selected queue', async () => {
    const { service, queues } = setup();
    await service.addJob(QUEUE_NAMES.scan, 'analysis', { uploadId: 'u1' });
    expect(queues[0]!.add).toHaveBeenCalledWith(
      'analysis',
      expect.objectContaining({ type: 'analysis' }),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('publishes a creation event', async () => {
    const { service } = setup();
    const listener = vi.fn();
    const events = (service as unknown as { events: QueueEvents }).events;
    events.on('queue.job.created', listener);
    await service.addJob(QUEUE_NAMES.file, 'extract', { uploadId: 'u1' });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('gets a BullMQ job', async () => {
    const { service, queues } = setup();
    const job = { id: 'j1', getState: vi.fn() };
    queues[0]!.getJob.mockResolvedValue(job);
    await expect(service.getJob(QUEUE_NAMES.scan, 'j1')).resolves.toBe(job);
  });

  it('returns a job state', async () => {
    const { service, queues } = setup();
    queues[0]!.getJob.mockResolvedValue({ getState: vi.fn().mockResolvedValue('waiting') });
    await expect(service.getJobStatus(QUEUE_NAMES.scan, 'j1')).resolves.toBe('waiting');
  });

  it('returns null for an unknown job', async () => {
    const { service, queues } = setup();
    queues[0]!.getJob.mockResolvedValue(undefined);
    await expect(service.getJobStatus(QUEUE_NAMES.scan, 'missing')).resolves.toBeNull();
  });

  it('removes a job', async () => {
    const { service, queues } = setup();
    await service.removeJob(QUEUE_NAMES.scan, 'j1');
    expect(queues[0]!.remove).toHaveBeenCalledWith('j1');
  });

  it('retries a failed job', async () => {
    const { service, queues } = setup();
    const retry = vi.fn();
    queues[0]!.getJob.mockResolvedValue({ retry });
    await service.retryJob(QUEUE_NAMES.scan, 'j1');
    expect(retry).toHaveBeenCalledWith('failed');
  });

  it('rejects retry for an unknown job', async () => {
    const { service, queues } = setup();
    queues[0]!.getJob.mockResolvedValue(undefined);
    await expect(service.retryJob(QUEUE_NAMES.scan, 'missing')).rejects.toThrow('not found');
  });

  it('pauses a queue', async () => {
    const { service, queues } = setup();
    await service.pauseQueue(QUEUE_NAMES.report);
    expect(queues[4]!.pause).toHaveBeenCalledOnce();
  });

  it('resumes a queue', async () => {
    const { service, queues } = setup();
    await service.resumeQueue(QUEUE_NAMES.report);
    expect(queues[4]!.resume).toHaveBeenCalledOnce();
  });

  it('checks every queue health', async () => {
    const { service, queues } = setup();
    await service.healthCheck();
    for (const queue of queues) expect(queue!.getJobCounts).toHaveBeenCalledOnce();
  });

  it('closes every queue during shutdown', async () => {
    const { service, queues } = setup();
    await service.onModuleDestroy();
    for (const queue of queues) expect(queue!.close).toHaveBeenCalledOnce();
  });
});
