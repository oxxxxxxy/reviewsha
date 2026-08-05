import { EventEmitter } from 'node:events';
import type { QueueJobData, QueueName } from './queue.constants';

export const QUEUE_EVENTS = {
  created: 'queue.job.created',
  completed: 'queue.job.completed',
  failed: 'queue.job.failed',
} as const;

export interface QueueEvent {
  readonly queue: QueueName;
  readonly job: QueueJobData;
  readonly error?: string;
}

export class QueueEvents extends EventEmitter {
  publish(event: string, payload: QueueEvent): boolean {
    return this.emit(event, payload);
  }
}
