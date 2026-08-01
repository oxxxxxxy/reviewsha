import { describe, expect, it } from 'vitest';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';

describe('ApiLoggerService', () => {
  it('formats messages using the shared logging format', () => {
    const logger = new ApiLoggerService();

    expect(logger.format('INFO', 'User created', 'AuthService')).toContain(
      'API INFO AuthService User created',
    );
  });

  it('exposes log, warn and error methods', () => {
    const logger = new ApiLoggerService();

    expect(logger.log).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.error).toBeInstanceOf(Function);
  });
});
