import type { Job } from 'bullmq';
import type { QueueJobResult } from '../queue/queue.events';

export interface JobHandler {
  readonly type: string;
  execute(job: Job): Promise<QueueJobResult>;
}
