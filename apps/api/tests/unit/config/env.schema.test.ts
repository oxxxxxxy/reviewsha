import { describe, expect, it } from 'vitest';

import { envSchema, validateEnv } from '../../../src/config/env.schema';

describe('api env schema', () => {
  it('provides development defaults', () => {
    const config = validateEnv({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.API_HOST).toBe('0.0.0.0');
    expect(config.API_PORT).toBe(3000);
    expect(config.API_PREFIX).toBe('api/v1');
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173');
    expect(config.PRISMA_LOG_QUERIES).toBe(false);
    expect(config.JWT_SECRET).toBe('reviewsha-access-secret-change-me');
    expect(config.JWT_EXPIRES_IN).toBe('15m');
    expect(config.JWT_REFRESH_SECRET).toBe('reviewsha-refresh-secret-change-me');
    expect(config.JWT_REFRESH_EXPIRES_IN).toBe('30d');
  });

  it('accepts production-like env', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'production',
      API_HOST: '127.0.0.1',
      API_PORT: '8080',
      API_PREFIX: 'api/v1',
      CORS_ORIGIN: 'https://reviewsha.example.com',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/reviewsha',
      PRISMA_LOG_QUERIES: 'true',
      JWT_SECRET: 'access',
      JWT_EXPIRES_IN: '10m',
      JWT_REFRESH_SECRET: 'refresh',
      JWT_REFRESH_EXPIRES_IN: '7d',
      JWT_ISSUER: 'issuer',
      JWT_AUDIENCE: 'audience',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.API_PORT).toBe(8080);
      expect(result.data.PRISMA_LOG_QUERIES).toBe(true);
      expect(result.data.JWT_SECRET).toBe('access');
    }
  });

  it('rejects invalid API_PORT', () => {
    expect(envSchema.safeParse({ API_PORT: '-1' }).success).toBe(false);
  });

  it('rejects invalid NODE_ENV', () => {
    expect(envSchema.safeParse({ NODE_ENV: 'invalid' }).success).toBe(false);
  });
});
