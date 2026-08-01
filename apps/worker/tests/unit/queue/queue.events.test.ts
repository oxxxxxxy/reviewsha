import { describe, expect, it } from 'vitest';

import { formatJobCompletedLog, formatJobReceivedLog } from '../../../src/queue/queue.events';

describe('queue event log formatters', () => {
  it('formats received job log line', () => {
    expect(formatJobReceivedLog('ai.queue', { id: '15', name: 'ai' })).toBe(
      'Received ai.queue job #15 (ai)',
    );
  });

  it('formats completed job log line', () => {
    expect(formatJobCompletedLog('report', { id: '22', name: 'report' })).toBe(
      'Completed report job #22 (report)',
    );
  });

  it('handles missing job id', () => {
    expect(
      formatJobReceivedLog('notification.queue', { id: undefined, name: 'notification' }),
    ).toBe('Received notification.queue job #unknown (notification)');
  });
});
