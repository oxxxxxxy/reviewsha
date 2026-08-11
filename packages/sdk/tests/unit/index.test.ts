import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_URLS } from '@reviewsha/config';
import {
  ApiClient,
  ApiClientError,
  createAuthorizationHeader,
  createReviewshaSDK,
  type ChatStreamEvent,
} from '../../src/index.js';

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

  it('normalizes documented API errors without exposing Axios internals', async () => {
    const client = new ApiClient({ baseURL: 'http://localhost:3000/api/v1' });
    vi.spyOn(client.http, 'get').mockRejectedValue(
      Object.assign(new Error('request failed'), {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            success: false,
            error: {
              statusCode: 422,
              error: 'Unprocessable Entity',
              message: 'Invalid project name',
              path: '/api/v1/projects',
              timestamp: '2026-08-11T00:00:00.000Z',
            },
          },
        },
      }),
    );

    const result = client.get('/projects');
    await expect(result).rejects.toBeInstanceOf(ApiClientError);
    await expect(result).rejects.toMatchObject({
      status: 422,
      message: 'Invalid project name',
      payload: { error: { statusCode: 422 } },
    });
  });

  it('normalizes compact validation errors returned by upload endpoints', async () => {
    const client = new ApiClient({ baseURL: 'http://localhost:3000/api/v1' });
    vi.spyOn(client.http, 'get').mockRejectedValue(
      Object.assign(new Error('request failed'), {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            error: { code: 'INVALID_ARCHIVE', message: 'Archive contains a forbidden path' },
          },
        },
      }),
    );

    await expect(client.get('/projects/project-id/uploads')).rejects.toMatchObject({
      status: 422,
      message: 'Archive contains a forbidden path',
      payload: { error: { message: 'Archive contains a forbidden path' } },
    });
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

  it('keeps runtime services aligned with the generated Chat/Admin contract', async () => {
    const sdk = createReviewshaSDK({ baseURL: 'http://localhost:3000/api/v1' });
    const get = vi.spyOn(sdk.client, 'get').mockResolvedValue({} as never);
    const post = vi.spyOn(sdk.client, 'post').mockResolvedValue({} as never);
    const patch = vi.spyOn(sdk.client, 'patch').mockResolvedValue({} as never);
    const stream = vi.spyOn(sdk.client, 'stream').mockResolvedValue(undefined);

    await sdk.chat.create('project-id');
    await sdk.chat.list('project-id');
    await sdk.chat.getMessages('session-id');
    await sdk.chat.stream('session-id', { message: 'Hello' }, () => undefined);
    await sdk.admin.queueOverview();
    await sdk.admin.users({
      page: 2,
      limit: 20,
      search: 'admin',
      role: 'ADMIN',
      isActive: false,
    });
    await sdk.admin.userDetails('user-id');
    await sdk.admin.updateUser('user-id', { isActive: false });
    await sdk.admin.projects({ page: 2, limit: 20, search: 'reviewsha' });
    await sdk.admin.projectDetails('project-id');
    await sdk.admin.logs({
      event: 'chat.generation.failed',
      requestId: 'request-1',
      userId: 'user-1',
    });
    await sdk.admin.aiUsage();
    await sdk.admin.statistics();

    expect(post).toHaveBeenCalledWith('/projects/project-id/chat', { title: undefined });
    expect(get).toHaveBeenCalledWith('/projects/project-id/chat', { signal: undefined });
    expect(get).toHaveBeenCalledWith('/chat/session-id/messages', { signal: undefined });
    expect(stream).toHaveBeenCalledWith(
      '/chat/session-id/stream',
      { message: 'Hello' },
      expect.any(Function),
      undefined,
    );
    expect(get).toHaveBeenCalledWith('/admin/queues');
    expect(get).toHaveBeenCalledWith('/admin/users', {
      params: { page: 2, limit: 20, search: 'admin', role: 'ADMIN', isActive: false },
    });
    expect(get).toHaveBeenCalledWith('/admin/users/user-id');
    expect(patch).toHaveBeenCalledWith('/admin/users/user-id', { isActive: false });
    expect(get).toHaveBeenCalledWith('/admin/projects', {
      params: { page: 2, limit: 20, search: 'reviewsha' },
    });
    expect(get).toHaveBeenCalledWith('/admin/projects/project-id');
    expect(get).toHaveBeenCalledWith('/admin/logs', {
      params: {
        event: 'chat.generation.failed',
        requestId: 'request-1',
        userId: 'user-1',
      },
    });
    expect(get).toHaveBeenCalledWith('/admin/ai-usage', { params: undefined });
    expect(get).toHaveBeenCalledWith('/admin/statistics', { params: undefined });
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

  it('exposes a typed Chat stream event protocol', async () => {
    const sdk = createReviewshaSDK({ baseURL: 'http://localhost:3000/api/v1' });
    const stream = vi.spyOn(sdk.client, 'stream').mockResolvedValue(undefined);
    const events: ChatStreamEvent[] = [];

    await sdk.chat.stream('session-id', { message: 'Hello' }, (event) => events.push(event));

    expect(stream).toHaveBeenCalledWith(
      '/chat/session-id/stream',
      { message: 'Hello' },
      expect.any(Function),
      undefined,
    );
  });

  it('passes AbortSignal through list and report download transports', async () => {
    const sdk = createReviewshaSDK({ baseURL: 'http://localhost/api/v1' });
    const signal = new AbortController().signal;
    vi.spyOn(sdk.client.http, 'get').mockResolvedValue({ data: { data: [], meta: {} } } as never);

    await sdk.projects.list({ page: 1 }, signal);
    await sdk.reports.download('report-id', 'pdf', signal);

    expect(sdk.client.http.get).toHaveBeenNthCalledWith(
      1,
      '/projects',
      expect.objectContaining({ signal }),
    );
    expect(sdk.client.http.get).toHaveBeenNthCalledWith(
      2,
      '/reports/report-id/export/pdf',
      expect.objectContaining({ signal, responseType: 'blob' }),
    );
  });

  it('keeps admin queue methods aligned with the OpenAPI response shapes', async () => {
    const sdk = createReviewshaSDK({ baseURL: 'http://localhost/api/v1' });
    vi.spyOn(sdk.client, 'get')
      .mockResolvedValueOnce({ scan: { status: 'HEALTHY' } } as never)
      .mockResolvedValueOnce({
        items: [],
        meta: { page: 1, limit: 20, total: 0, pages: 0 },
      } as never);

    await sdk.admin.queueOverview();
    await sdk.admin.queueJobs('ai.queue', { page: 1, limit: 20 });

    expect(sdk.client.get).toHaveBeenNthCalledWith(1, '/admin/queues');
    expect(sdk.client.get).toHaveBeenNthCalledWith(2, '/admin/queues/ai.queue/jobs', {
      params: { page: 1, limit: 20 },
    });
  });
});
