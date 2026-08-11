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
    process.env.MAX_SESSIONS_PER_USER = '5';
    process.env.INTERNAL_API_KEY = 'internal';

    const config = appConfig();

    expect(config.app.port).toBe(4000);
    expect(config.app.apiPrefix).toBe('api/v1');
    expect(config.database.url).toBe('postgresql://custom');
    expect(config.database.logQueries).toBe(true);
    expect(config.sessions.maxSessionsPerUser).toBe(5);
    expect(config.security.internalApiKey).toBe('internal');
    expect(config.jwt).toEqual({
      access: {
        secret: 'access',
        expiresIn: '10m',
        issuer: 'issuer',
        audience: 'audience',
        algorithm: 'HS256',
      },
      refresh: {
        secret: 'refresh',
        expiresIn: '7d',
        issuer: 'issuer',
        audience: 'audience',
        algorithm: 'HS256',
      },
    });
  });

  it('uses defaults', () => {
    delete process.env.API_PORT;
    delete process.env.API_PREFIX;

    const config = appConfig();

    expect(config.app.port).toBe(3000);
    expect(config.app.apiPrefix).toBe('api/v1');
    expect(config.database.logQueries).toBe(false);
    expect(config.sessions.maxSessionsPerUser).toBe(10);
    expect(config.security.internalApiKey).toBe('reviewsha-internal-api-key-change-me');
    expect(config.jwt.access.expiresIn).toBe('15m');
    expect(config.jwt.refresh.expiresIn).toBe('30d');
    expect(config.app.corsOrigin).toEqual(['http://localhost:5173', 'http://localhost:5174']);
  });

  it('accepts a comma-separated CORS origin list', () => {
    process.env.CORS_ORIGIN = 'https://web.example.com, https://admin.example.com';

    expect(appConfig().app.corsOrigin).toEqual([
      'https://web.example.com',
      'https://admin.example.com',
    ]);
  });
});
