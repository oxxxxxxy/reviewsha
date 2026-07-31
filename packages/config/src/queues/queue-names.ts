export const QUEUE_NAMES = {
  upload: 'upload',
  extract: 'extract',
  parse: 'parse',
  analyze: 'analyze',
  report: 'report',
  cleanup: 'cleanup',
} as const;

export type QueueKey = keyof typeof QUEUE_NAMES;
export type QueueName = (typeof QUEUE_NAMES)[QueueKey];
export const QUEUE_NAME_LIST = Object.values(QUEUE_NAMES);
