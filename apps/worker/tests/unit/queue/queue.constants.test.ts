import { describe, expect, it } from 'vitest';

import { QUEUE_NAME_LIST, QUEUE_NAMES } from '../../../src/queue/queue.constants';

describe('queue constants', () => {
  it('defines architecture queues in the required order', () => {
    expect(QUEUE_NAMES).toEqual({
      scan: 'scan.queue',
      file: 'file.queue',
      ai: 'ai.queue',
      chat: 'chat.queue',
      report: 'report.queue',
      notification: 'notification.queue',
      deadLetter: 'dead-letter.queue',
    });

    expect(QUEUE_NAME_LIST).toEqual([
      'scan.queue',
      'file.queue',
      'ai.queue',
      'chat.queue',
      'report.queue',
      'notification.queue',
      'dead-letter.queue',
    ]);
  });

  it('does not contain duplicate queue names', () => {
    expect(new Set(QUEUE_NAME_LIST).size).toBe(QUEUE_NAME_LIST.length);
  });
});
