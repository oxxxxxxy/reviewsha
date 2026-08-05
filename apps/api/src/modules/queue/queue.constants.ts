import { QUEUE_NAMES, QUEUE_NAME_LIST, type QueueKey, type QueueName } from '@reviewsha/config';

export { QUEUE_NAMES, QUEUE_NAME_LIST };
export type { QueueName };
export type { QueueKey };

export type QueueJobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

export type QueueJobPayload = Record<string, unknown>;

export interface QueueJobData {
  readonly id: string;
  readonly type: string;
  readonly payload: QueueJobPayload;
  readonly createdAt: string;
}

export const DEFAULT_QUEUE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1_000 },
  removeOnComplete: true,
  removeOnFail: false,
};
