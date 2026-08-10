import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_URLS } from '@reviewsha/config';
import { ApiClient, createAuthorizationHeader, createReviewshaSDK } from '../../src/index.js';

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
    const sdk = createReviewshaSDK({ baseURL: 'http://localhost:3000/api/v1' });

    expect(sdk.client).toBeInstanceOf(ApiClient);
    expect(sdk.auth.login).toBeTypeOf('function');
    expect(sdk.projects.list).toBeTypeOf('function');
    expect(sdk.pipelines.get).toBeTypeOf('function');
    expect(sdk.analyses.list).toBeTypeOf('function');
    expect(sdk.analyses.start).toBeTypeOf('function');
    expect(sdk.uploads.upload).toBeTypeOf('function');
    expect(sdk.reports.download).toBeTypeOf('function');
    expect(sdk.chat.create).toBeTypeOf('function');
    expect(sdk.admin.users).toBeTypeOf('function');
  });

  it('parses SSE chunks through the shared streaming transport', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: token\ndata: {"token":"hello"}\n\n'));
        controller.enqueue(encoder.encode('event: done\ndata: {"ok":true}\n\n'));
        controller.close();
      },
    });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
      );
    const client = new ApiClient({ baseURL: 'http://localhost/api/v1', accessToken: 'token' });
    const events: Array<{ event: string; data: unknown }> = [];

    await client.stream('/chat/session/stream', { message: 'Hi' }, (event) => events.push(event));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost/api/v1/chat/session/stream',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
    expect(events).toEqual([
      { event: 'token', data: { token: 'hello' } },
      { event: 'done', data: { ok: true } },
    ]);
    fetchMock.mockRestore();
  });
});
