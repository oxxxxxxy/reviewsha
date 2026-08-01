import { describe, expect, it, vi } from 'vitest';

import { QUEUE_NAME_LIST, QUEUE_NAMES } from '../../../src/queue/queue.constants';
import { QueueService } from '../../../src/queue/queue.service';
import { WorkerLoggerService } from '../../../src/common/logger/worker-logger.service';

type MockConfig = {
  getOrThrow: <T>(key: string) => T;
};

function createConfig(redisRequired = false): MockConfig {
  return {
    getOrThrow: vi.fn((key: string) => {
      const values: Record<string, unknown> = {
        'worker.redisUrl': 'redis://127.0.0.1:1',
        'worker.redisRequired': redisRequired,
      };
      return values[key];
    }) as MockConfig['getOrThrow'],
  };
}

function createLogger(): WorkerLoggerService {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as WorkerLoggerService;
}

describe('QueueService', () => {
  it('returns all required queue names', () => {
    const service = new QueueService(createConfig() as never, createLogger());

    expect(service.getQueueNames()).toEqual(QUEUE_NAME_LIST);
  });

  it('starts in Redis unavailable skeleton mode when Redis is not required', async () => {
    const logger = createLogger();
    const service = new QueueService(createConfig(false) as never, logger);

    await service.initialize();

    expect(service.isRedisAvailable()).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Redis unavailable'),
      'QueueService',
    );
    await service.close();
  });

  it('throws when Redis is required and unavailable', async () => {
    const service = new QueueService(createConfig(true) as never, createLogger());

    await expect(service.initialize()).rejects.toBeTruthy();
  });

  it('enqueue methods return disabled result in skeleton mode', async () => {
    const service = new QueueService(createConfig(false) as never, createLogger());

    await expect(service.enqueueUpload()).resolves.toEqual({
      queue: QUEUE_NAMES.upload,
      jobName: 'upload',
      disabled: true,
    });
    await expect(service.enqueueExtract()).resolves.toMatchObject({
      queue: QUEUE_NAMES.extract,
      disabled: true,
    });
    await expect(service.enqueueParse()).resolves.toMatchObject({
      queue: QUEUE_NAMES.parse,
      disabled: true,
    });
    await expect(service.enqueueAnalyze()).resolves.toMatchObject({
      queue: QUEUE_NAMES.analyze,
      disabled: true,
    });
    await expect(service.enqueueReport()).resolves.toMatchObject({
      queue: QUEUE_NAMES.report,
      disabled: true,
    });
    await expect(service.enqueueCleanup()).resolves.toMatchObject({
      queue: QUEUE_NAMES.cleanup,
      disabled: true,
    });

    await service.close();
  });

  it('registers worker instances for graceful shutdown', async () => {
    const service = new QueueService(createConfig(false) as never, createLogger());
    const worker = { close: vi.fn().mockResolvedValue(undefined) };

    service.registerWorker(worker as never);
    await service.close();

    expect(worker.close).toHaveBeenCalledTimes(1);
  });
});
