import { afterEach, describe, expect, it } from 'vitest';

import appConfig from '../../../src/config/app.config';

const originalEnv = { ...process.env };

describe('appConfig', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('maps environment variables', () => {
    process.env.API_PORT = '4000';
    process.env.API_PREFIX = 'api/v1';
    process.env.DATABASE_URL = 'postgresql://custom';
    process.env.PRISMA_LOG_QUERIES = 'true';
    process.env.JWT_SECRET = 'access';
    process.env.JWT_EXPIRES_IN = '10m';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.JWT_ISSUER = 'issuer';
    process.env.JWT_AUDIENCE = 'audience';

    const config = appConfig();

    expect(config.app.port).toBe(4000);
    expect(config.app.apiPrefix).toBe('api/v1');
    expect(config.database.url).toBe('postgresql://custom');
    expect(config.database.logQueries).toBe(true);
    expect(config.jwt).toEqual({
      secret: 'access',
      expiresIn: '10m',
      refreshSecret: 'refresh',
      refreshExpiresIn: '7d',
      issuer: 'issuer',
      audience: 'audience',
    });
  });

  it('uses defaults', () => {
    delete process.env.API_PORT;
    delete process.env.API_PREFIX;

    const config = appConfig();

    expect(config.app.port).toBe(3000);
    expect(config.app.apiPrefix).toBe('api/v1');
    expect(config.database.logQueries).toBe(false);
    expect(config.jwt.expiresIn).toBe('15m');
    expect(config.jwt.refreshExpiresIn).toBe('30d');
  });
});
