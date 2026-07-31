import { describe, expect, it } from 'vitest';

import { WorkerLoggerService } from './worker-logger.service';

describe('WorkerLoggerService', () => {
  it('exposes log, warn and error methods', () => {
    const logger = new WorkerLoggerService();

    expect(logger.log).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.error).toBeInstanceOf(Function);
  });

  it('formats messages using the shared logging format', () => {
    const logger = new WorkerLoggerService();

    expect(logger.format('INFO', 'Worker started', 'Bootstrap')).toContain(
      'WORKER INFO Bootstrap Worker started',
    );
  });

  it('does not throw when logging messages', () => {
    const logger = new WorkerLoggerService();

    expect(() => logger.log('Worker started')).not.toThrow();
    expect(() => logger.warn('Redis unavailable')).not.toThrow();
    expect(() => logger.error('Redis failed')).not.toThrow();
  });
});
