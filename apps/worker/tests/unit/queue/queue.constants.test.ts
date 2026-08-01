import { describe, expect, it } from 'vitest';

import { QUEUE_NAME_LIST, QUEUE_NAMES } from '../../../src/queue/queue.constants';

describe('queue constants', () => {
  it('defines all MVP queues in the required order', () => {
    expect(QUEUE_NAMES).toEqual({
      upload: 'upload',
      extract: 'extract',
      parse: 'parse',
      analyze: 'analyze',
      report: 'report',
      cleanup: 'cleanup',
    });

    expect(QUEUE_NAME_LIST).toEqual(['upload', 'extract', 'parse', 'analyze', 'report', 'cleanup']);
  });

  it('does not contain duplicate queue names', () => {
    expect(new Set(QUEUE_NAME_LIST).size).toBe(QUEUE_NAME_LIST.length);
  });
});
