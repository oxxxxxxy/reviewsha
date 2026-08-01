import { describe, expect, it } from 'vitest';

import {
  API_BASE_PATH,
  API_PREFIX,
  DEFAULT_PAGE_SIZE,
  DEFAULT_URLS,
  ENV_KEYS,
  QUEUE_NAME_LIST,
  QUEUE_NAMES,
  STORAGE_BUCKETS,
  UPLOAD_LIMITS,
  validateSharedEnv,
} from '../../src/index.js';

describe('@reviewsha/config public API', () => {
  it('exports API constants', () => {
    expect(API_PREFIX).toBe('api');
    expect(API_BASE_PATH).toBe('api/v1');
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('exports queue names', () => {
    expect(QUEUE_NAMES.ai).toBe('ai.queue');
    expect(QUEUE_NAME_LIST).toEqual([
      'scan.queue',
      'file.queue',
      'ai.queue',
      'report.queue',
      'notification.queue',
    ]);
  });

  it('exports storage buckets and upload limits', () => {
    expect(STORAGE_BUCKETS.projects).toBe('projects');
    expect(STORAGE_BUCKETS.temp).toBe('temp');
    expect(STORAGE_BUCKETS.exports).toBe('exports');
    expect(STORAGE_BUCKETS.avatars).toBe('avatars');
    expect(UPLOAD_LIMITS.maxArchiveSizeBytes).toBe(50 * 1024 * 1024);
  });

  it('exports environment keys and default URLs', () => {
    expect(ENV_KEYS.redisUrl).toBe('REDIS_URL');
    expect(DEFAULT_URLS.api).toBe('http://localhost:3000/api/v1');
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
