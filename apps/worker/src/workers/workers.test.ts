import { describe, expect, it, vi } from 'vitest';

import { AnalyzeWorker } from './analyze.worker';
import { CleanupWorker } from './cleanup.worker';
import { ExtractWorker } from './extract.worker';
import { ParseWorker } from './parse.worker';
import { ReportWorker } from './report.worker';
import { UploadWorker } from './upload.worker';
import { QUEUE_NAMES } from '../queue/queue.constants';

const workerCases = [
  { WorkerClass: UploadWorker, queueName: QUEUE_NAMES.upload },
  { WorkerClass: ExtractWorker, queueName: QUEUE_NAMES.extract },
  { WorkerClass: ParseWorker, queueName: QUEUE_NAMES.parse },
  { WorkerClass: AnalyzeWorker, queueName: QUEUE_NAMES.analyze },
  { WorkerClass: ReportWorker, queueName: QUEUE_NAMES.report },
  { WorkerClass: CleanupWorker, queueName: QUEUE_NAMES.cleanup },
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
});
