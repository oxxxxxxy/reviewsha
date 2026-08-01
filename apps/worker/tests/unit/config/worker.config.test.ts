import { afterEach, describe, expect, it } from 'vitest';

import workerConfig from '../../../src/config/worker.config';

const originalEnv = { ...process.env };

describe('workerConfig', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('maps environment variables to typed worker config', () => {
    process.env.WORKER_NAME = 'custom-worker';
    process.env.WORKER_REDIS_REQUIRED = 'true';
    process.env.REDIS_URL = 'redis://custom:6379';
    process.env.AI_PROVIDER = 'mock';

    const config = workerConfig().worker;

    expect(config.workerName).toBe('custom-worker');
    expect(config.redisRequired).toBe(true);
    expect(config.redisUrl).toBe('redis://custom:6379');
    expect(config.aiProvider).toBe('mock');
  });

  it('uses defaults when env variables are absent', () => {
    delete process.env.WORKER_NAME;
    delete process.env.WORKER_REDIS_REQUIRED;
    delete process.env.REDIS_URL;

    const config = workerConfig().worker;

    expect(config.workerName).toBe('reviewsha-worker');
    expect(config.redisRequired).toBe(false);
    expect(config.redisUrl).toBe('redis://localhost:6379');
  });
});
