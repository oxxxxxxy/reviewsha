import { describe, expect, it } from 'vitest';

import { adminApiBaseUrl, adminApiClient } from '../../../src/api/client';

describe('adminApiClient', () => {
  it('uses configured admin API base URL fallback', () => {
    expect(adminApiBaseUrl).toBe('http://localhost:3000/api');
    expect(adminApiClient.defaults.baseURL).toBe(adminApiBaseUrl);
  });

  it('sets production-safe timeout', () => {
    expect(adminApiClient.defaults.timeout).toBe(15_000);
  });

  it('sends and accepts JSON by default', () => {
    expect(String(adminApiClient.defaults.headers.common.Accept)).toContain('application/json');
    expect(adminApiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('has request and response interceptors registered', () => {
    expect(adminApiClient.interceptors.request).toBeDefined();
    expect(adminApiClient.interceptors.response).toBeDefined();
  });
});
