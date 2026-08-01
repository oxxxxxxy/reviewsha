import { Queue, type JobsOptions } from 'bullmq';
import IORedis, { type RedisOptions } from 'ioredis';

import type { QueueName } from './queue.constants';

/**
 * Shared Redis options used by BullMQ Queue and Worker connections.
 *
 * BullMQ requires `maxRetriesPerRequest: null` for blocking operations. Keeping
 * this factory centralized prevents queue processors from drifting apart as the
 * pipeline grows.
 */
export const BULLMQ_REDIS_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 500,
};

/** Default retry and cleanup policy for skeleton queue jobs. */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1_000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

/** Creates an isolated Redis connection configured for BullMQ. */
export function createRedisConnection(redisUrl: string, lazyConnect = false): IORedis {
  return new IORedis(redisUrl, {
    ...BULLMQ_REDIS_OPTIONS,
    lazyConnect,
  });
}

/** Creates a BullMQ queue with the shared connection defaults. */
export function createQueue(queueName: QueueName, connection: IORedis): Queue {
  return new Queue(queueName, { connection });
}
