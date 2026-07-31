import { describe, expect, it } from 'vitest';

import {
  API_PREFIX,
  DEFAULT_PAGE_SIZE,
  DEFAULT_URLS,
  ENV_KEYS,
  QUEUE_NAME_LIST,
  QUEUE_NAMES,
  STORAGE_BUCKETS,
  UPLOAD_LIMITS,
  validateSharedEnv,
} from './index.js';

describe('@reviewsha/config public API', () => {
  it('exports API constants', () => {
    expect(API_PREFIX).toBe('api');
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('exports queue names', () => {
    expect(QUEUE_NAMES.analyze).toBe('analyze');
    expect(QUEUE_NAME_LIST).toEqual(['upload', 'extract', 'parse', 'analyze', 'report', 'cleanup']);
  });

  it('exports storage buckets and upload limits', () => {
    expect(STORAGE_BUCKETS.projects).toBe('projects');
    expect(UPLOAD_LIMITS.maxArchiveSizeBytes).toBe(50 * 1024 * 1024);
  });

  it('exports environment keys and default URLs', () => {
    expect(ENV_KEYS.redisUrl).toBe('REDIS_URL');
    expect(DEFAULT_URLS.redis).toBe('redis://localhost:6379');
  });

  it('validates shared env', () => {
    expect(
      validateSharedEnv({ NODE_ENV: 'test', REDIS_URL: 'redis://localhost:6379' }),
    ).toMatchObject({
      NODE_ENV: 'test',
      REDIS_URL: 'redis://localhost:6379',
    });
  });
});
