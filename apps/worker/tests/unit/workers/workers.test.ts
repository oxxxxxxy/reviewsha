import { describe, expect, it, vi } from 'vitest';

import { AIWorker } from '../../../src/workers/ai.worker';
import { FileWorker } from '../../../src/workers/file.worker';
import { NotificationWorker } from '../../../src/workers/notification.worker';
import { ReportWorker } from '../../../src/workers/report.worker';
import { ScanWorker } from '../../../src/workers/scan.worker';
import { QUEUE_NAMES } from '../../../src/queue/queue.constants';

const workerCases = [
  { WorkerClass: ScanWorker, queueName: QUEUE_NAMES.scan },
  { WorkerClass: FileWorker, queueName: QUEUE_NAMES.file },
  { WorkerClass: AIWorker, queueName: QUEUE_NAMES.ai },
  { WorkerClass: ReportWorker, queueName: QUEUE_NAMES.report },
  { WorkerClass: NotificationWorker, queueName: QUEUE_NAMES.notification },
] as const;

function createConfig() {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'worker.redisUrl') {
        return 'redis://127.0.0.1:1';
      }
      return undefined;
    }),
  };
}

function createLogger() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createQueueService(redisAvailable: boolean) {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    isRedisAvailable: vi.fn(() => redisAvailable),
    registerWorker: vi.fn(),
  };
}

describe('queue workers', () => {
  it.each(workerCases)(
    '$WorkerClass.name skips startup when Redis is unavailable',
    async ({ WorkerClass }) => {
      const logger = createLogger();
      const queueService = createQueueService(false);
      const worker = new WorkerClass(
        createConfig() as never,
        logger as never,
        queueService as never,
      );

      await worker.start();

      expect(queueService.initialize).toHaveBeenCalledTimes(1);
      expect(queueService.isRedisAvailable).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('skipped'),
        WorkerClass.name,
      );
    },
  );

  it.each(workerCases)(
    '$WorkerClass.name is idempotent in skeleton mode',
    async ({ WorkerClass }) => {
      const queueService = createQueueService(false);
      const worker = new WorkerClass(
        createConfig() as never,
        createLogger() as never,
        queueService as never,
      );

      await worker.start();
      await worker.start();

      expect(queueService.initialize).toHaveBeenCalledTimes(2);
      await expect(worker.close()).resolves.toBeUndefined();
    },
  );

  it('binds workers to architecture queue names', () => {
    expect(workerCases.map((item) => item.queueName)).toEqual([
      'scan.queue',
      'file.queue',
      'ai.queue',
      'report.queue',
      'notification.queue',
    ]);
  });
});
