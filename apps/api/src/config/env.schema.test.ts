import { describe, expect, it } from 'vitest';

import { envSchema, validateEnv } from './env.schema';

describe('api env schema', () => {
  it('provides development defaults', () => {
    const config = validateEnv({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.API_HOST).toBe('0.0.0.0');
    expect(config.API_PORT).toBe(3000);
    expect(config.API_PREFIX).toBe('api');
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173');
  });

  it('accepts production-like env', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'production',
      API_HOST: '127.0.0.1',
      API_PORT: '8080',
      API_PREFIX: 'api',
      CORS_ORIGIN: 'https://reviewsha.example.com',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/reviewsha',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.API_PORT).toBe(8080);
    }
  });

  it('rejects invalid API_PORT', () => {
    expect(envSchema.safeParse({ API_PORT: '-1' }).success).toBe(false);
  });

  it('rejects invalid NODE_ENV', () => {
    expect(envSchema.safeParse({ NODE_ENV: 'invalid' }).success).toBe(false);
  });
});
