import { describe, expect, it } from 'vitest';

import { validateWorkerEnv, workerEnvSchema } from '../../../src/config/env.schema';

describe('workerEnvSchema', () => {
  it('accepts a complete production-like environment', () => {
    const result = workerEnvSchema.safeParse({
      NODE_ENV: 'production',
      WORKER_NAME: 'worker-prod-1',
      WORKER_REDIS_REQUIRED: 'true',
      REDIS_URL: 'redis://redis:6379',
      DATABASE_URL: 'postgresql://user:pass@postgres:5432/reviewsha',
      MINIO_ENDPOINT: 'http://minio:9000',
      MINIO_ACCESS_KEY: 'access',
      MINIO_SECRET_KEY: 'secret',
      AI_PROVIDER: 'deepseek',
      OMNIROUTER_API_KEY: 'omnirouter-key',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.WORKER_REDIS_REQUIRED).toBe(true);
    }
  });

  it('requires explicit storage and AI credentials in production', () => {
    expect(workerEnvSchema.safeParse({ NODE_ENV: 'production' }).success).toBe(false);
  });

  it('provides safe development defaults for skeleton startup', () => {
    const config = validateWorkerEnv({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.WORKER_NAME).toBe('reviewsha-worker');
    expect(config.WORKER_REDIS_REQUIRED).toBe(false);
    expect(config.REDIS_URL).toBe('redis://localhost:6379');
    expect(config.AI_PROVIDER).toBe('deepseek');
    expect(config.AI_MAX_TOKENS).toBe(6000);
  });

  it('rejects invalid Redis URL', () => {
    const result = workerEnvSchema.safeParse({ REDIS_URL: 'not-url' });

    expect(result.success).toBe(false);
  });

  it('rejects unsupported AI provider', () => {
    const result = workerEnvSchema.safeParse({ AI_PROVIDER: 'unknown-provider' });

    expect(result.success).toBe(false);
  });
});
