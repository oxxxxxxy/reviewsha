import { describe, expect, it } from 'vitest';
import { DEFAULT_URLS } from '@reviewsha/config';
import { ApiClient, createAuthorizationHeader, createReviewshaSDK } from './index.js';

describe('@reviewsha/sdk public API', () => {
  it('creates axios client with shared defaults', () => {
    const client = new ApiClient();

    expect(client.http.defaults.baseURL).toBe(DEFAULT_URLS.api);
    expect(client.http.defaults.timeout).toBe(15_000);
    expect(String(client.http.defaults.headers.common.Accept)).toContain('application/json');
  });

  it('creates authorization header only when token exists', () => {
    expect(createAuthorizationHeader('token')).toEqual({ Authorization: 'Bearer token' });
    expect(createAuthorizationHeader(undefined)).toEqual({});
  });

  it('creates all domain API services', () => {
    const sdk = createReviewshaSDK({ baseURL: 'http://localhost:3000/api' });

    expect(sdk.client).toBeInstanceOf(ApiClient);
    expect(sdk.auth.login).toBeTypeOf('function');
    expect(sdk.projects.list).toBeTypeOf('function');
    expect(sdk.uploads.create).toBeTypeOf('function');
    expect(sdk.reports.export).toBeTypeOf('function');
    expect(sdk.chat.sendMessage).toBeTypeOf('function');
    expect(sdk.admin.users).toBeTypeOf('function');
  });
});
