import type { Job } from 'bullmq';

export type QueueJobResult = {
  status: 'completed';
  queue: string;
  jobId?: string;
};

export function formatJobReceivedLog(queueName: string, job: Pick<Job, 'id' | 'name'>): string {
  return `Received ${queueName} job #${job.id ?? 'unknown'} (${job.name})`;
}

export function formatJobCompletedLog(queueName: string, job: Pick<Job, 'id' | 'name'>): string {
  return `Completed ${queueName} job #${job.id ?? 'unknown'} (${job.name})`;
}
