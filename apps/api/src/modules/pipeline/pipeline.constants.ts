import { QUEUE_NAMES, type QueueName } from '../queue/queue.constants';

export const PIPELINE_STEPS = {
  extract: 'extract',
  parse: 'parse',
  analyze: 'analyze',
  merge: 'merge',
  report: 'report',
  notify: 'notify',
} as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[keyof typeof PIPELINE_STEPS];

export const PIPELINE_PROGRESS: Record<PipelineStep, number> = {
  extract: 20,
  parse: 40,
  analyze: 70,
  merge: 85,
  report: 95,
  notify: 100,
};

export const PIPELINE_QUEUE: Record<PipelineStep, QueueName> = {
  extract: QUEUE_NAMES.file,
  parse: QUEUE_NAMES.file,
  analyze: QUEUE_NAMES.ai,
  merge: QUEUE_NAMES.ai,
  report: QUEUE_NAMES.report,
  notify: QUEUE_NAMES.notification,
};

export const PIPELINE_RETRY_ATTEMPTS = 3;

export const RETRYABLE_ERROR_CODES = new Set([
  'REDIS_TIMEOUT',
  'MINIO_UNAVAILABLE',
  'AI_TIMEOUT',
  'NETWORK_ERROR',
]);

export const PIPELINE_STEP_ORDER: readonly PipelineStep[] = [
  PIPELINE_STEPS.extract,
  PIPELINE_STEPS.parse,
  PIPELINE_STEPS.analyze,
  PIPELINE_STEPS.merge,
  PIPELINE_STEPS.report,
  PIPELINE_STEPS.notify,
];
