export const QUEUE_NAMES = {
  scan: 'scan.queue',
  file: 'file.queue',
  ai: 'ai.queue',
  report: 'report.queue',
  notification: 'notification.queue',
} as const;

export type QueueKey = keyof typeof QUEUE_NAMES;
export type QueueName = (typeof QUEUE_NAMES)[QueueKey];
export const QUEUE_NAME_LIST = Object.values(QUEUE_NAMES);
