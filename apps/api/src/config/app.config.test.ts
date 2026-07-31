import { afterEach, describe, expect, it } from 'vitest';

import appConfig from './app.config';

const originalEnv = { ...process.env };

describe('appConfig', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('maps environment variables', () => {
    process.env.API_PORT = '4000';
    process.env.API_PREFIX = 'v1';
    process.env.DATABASE_URL = 'postgresql://custom';

    const config = appConfig();

    expect(config.app.port).toBe(4000);
    expect(config.app.apiPrefix).toBe('v1');
    expect(config.database.url).toBe('postgresql://custom');
  });

  it('uses defaults', () => {
    delete process.env.API_PORT;
    delete process.env.API_PREFIX;

    const config = appConfig();

    expect(config.app.port).toBe(3000);
    expect(config.app.apiPrefix).toBe('api');
  });
});
