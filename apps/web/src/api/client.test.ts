import { describe, expect, it } from 'vitest';

import { apiClient } from './client';

describe('apiClient', () => {
  it('uses API base URL fallback', () => {
    expect(apiClient.defaults.baseURL).toBe('http://localhost:3000/api');
  });

  it('sets timeout and JSON headers', () => {
    expect(apiClient.defaults.timeout).toBe(15_000);
    expect(String(apiClient.defaults.headers.common.Accept)).toContain('application/json');
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });
});
