import { describe, expect, it } from 'vitest';

import {
  BULLMQ_REDIS_OPTIONS,
  createQueue,
  createRedisConnection,
  DEFAULT_JOB_OPTIONS,
} from '../../../src/queue/queue.factory';

import { QUEUE_NAMES } from '../../../src/queue/queue.constants';

describe('queue factory helpers', () => {
  it('keeps BullMQ Redis options compatible with blocking workers', () => {
    expect(BULLMQ_REDIS_OPTIONS).toMatchObject({
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 500,
    });
  });

  it('creates lazy Redis connections for bootstrap probes', () => {
    const connection = createRedisConnection('redis://localhost:6379', true);

    expect(connection.status).toBe('wait');

    connection.disconnect();
  });

  it('creates queues with default names and exposes retry policy', async () => {
    const connection = createRedisConnection('redis://localhost:6379', true);
    const queue = createQueue(QUEUE_NAMES.upload, connection);

    expect(queue.name).toBe(QUEUE_NAMES.upload);
    expect(DEFAULT_JOB_OPTIONS).toMatchObject({
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 500,
    });

    await queue.close();
    connection.disconnect();
  });
});
