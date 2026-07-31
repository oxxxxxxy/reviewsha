import { describe, expect, it } from 'vitest';

import { formatJobCompletedLog, formatJobReceivedLog } from './queue.events';

describe('queue event log formatters', () => {
  it('formats received job log line', () => {
    expect(formatJobReceivedLog('analyze', { id: '15', name: 'analyze' })).toBe(
      'Received analyze job #15 (analyze)',
    );
  });

  it('formats completed job log line', () => {
    expect(formatJobCompletedLog('report', { id: '22', name: 'report' })).toBe(
      'Completed report job #22 (report)',
    );
  });

  it('handles missing job id', () => {
    expect(formatJobReceivedLog('cleanup', { id: undefined, name: 'cleanup' })).toBe(
      'Received cleanup job #unknown (cleanup)',
    );
  });
});
