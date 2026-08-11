import { describe, expect, it } from 'vitest';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';

describe('ApiLoggerService', () => {
  it('formats messages using the shared logging format', () => {
    const logger = new ApiLoggerService();

    expect(JSON.parse(logger.format('INFO', 'User created', 'AuthService'))).toMatchObject({
      service: 'API',
      level: 'INFO',
      context: 'AuthService',
      message: 'User created',
    });
  });

  it('exposes log, warn and error methods', () => {
    const logger = new ApiLoggerService();

    expect(logger.log).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.error).toBeInstanceOf(Function);
    expect(logger.debug).toBeInstanceOf(Function);
    expect(logger.fatal).toBeInstanceOf(Function);
  });

  it('formats structured metadata without exposing secret fields', () => {
    const logger = new ApiLoggerService();
    const output = logger.format('INFO', 'Request completed', 'RequestLogger', {
      event: 'http.request.completed',
      requestId: 'request-1',
      token: 'must-not-leak',
    });
    expect(output).toContain('http.request.completed');
    expect(output).toContain('request-1');
    expect(output).not.toContain('must-not-leak');
  });

  it('masks credential-like values before persistence', () => {
    const logger = new ApiLoggerService();
    expect(logger['mask']('token=secret-value password=hunter2')).toBe(
      'token=[REDACTED] password=[REDACTED]',
    );
  });
});
