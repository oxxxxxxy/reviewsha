import { describe, expect, it, vi } from 'vitest';
import { AIResponseValidator } from '../../../src/ai/services/ai-response.validator';
import { AIService } from '../../../src/ai/services/ai.service';
import { OmniRouterProvider } from '../../../src/ai/providers/omni-router.provider';
import { SecretRedactorService } from '../../../src/ai/services/secret-redactor.service';
import { ConfigService } from '@nestjs/config';

const request = {
  system: 'system',
  prompt: 'prompt',
  outputFormat: 'json' as const,
  chunks: [],
  task: 'bugs' as const,
};

describe('AI integration layer', () => {
  it('validates structured responses', () =>
    expect(
      new AIResponseValidator().parse(
        JSON.stringify({
          issues: [{ severity: 'HIGH', file: 'a.ts', problem: 'x', recommendation: 'y' }],
        }),
      ).issues,
    ).toHaveLength(1));
  it('rejects invalid JSON', () =>
    expect(() => new AIResponseValidator().parse('text')).toThrow('valid JSON'));
  it('rejects a response without issues', () =>
    expect(() => new AIResponseValidator().parse('{}')).toThrow('issues array'));
  it('rejects invalid severity', () =>
    expect(() =>
      new AIResponseValidator().parse(
        JSON.stringify({
          issues: [{ severity: 'BAD', file: 'a', problem: 'x', recommendation: 'y' }],
        }),
      ),
    ).toThrow('invalid fields'));
  it('AIService validates provider output', async () => {
    const provider = {
      generate: vi.fn().mockResolvedValue({
        content: '{"issues":[]}',
        model: 'mock',
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
      }),
    };
    await expect(
      new AIService(provider as never, new AIResponseValidator()).analyze({
        system: '',
        prompt: '',
        outputFormat: 'json',
        chunks: [],
        task: 'bugs',
      }),
    ).resolves.toMatchObject({ result: { issues: [] }, response: { model: 'mock' } });
  });
  it('provider requires credentials', async () => {
    const config = { get: vi.fn(() => undefined), getOrThrow: vi.fn() };
    await expect(
      new OmniRouterProvider(config as never).generate({
        system: '',
        prompt: '',
        outputFormat: 'json',
        chunks: [],
        task: 'bugs',
      }),
    ).rejects.toThrow('not configured');
  });
});

describe('AIService reliability', () => {
  it('retries temporary provider errors and succeeds', async () => {
    const provider = {
      generate: vi
        .fn()
        .mockRejectedValueOnce(new Error('HTTP 500'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue({ content: '{"issues":[]}', totalTokens: 1 }),
    };
    const service = new AIService(
      provider as never,
      new AIResponseValidator(),
      new ConfigService({ worker: { aiRetryAttempts: 3, aiRetryDelayMs: 1 } }),
    );
    await expect(service.analyze(request)).resolves.toMatchObject({ result: { issues: [] } });
    expect(provider.generate).toHaveBeenCalledTimes(3);
  });

  it.each(['invalid prompt', 'HTTP 400', 'response schema invalid'])(
    'does not retry permanent error: %s',
    async (message) => {
      const provider = { generate: vi.fn().mockRejectedValue(new Error(message)) };
      const service = new AIService(
        provider as never,
        new AIResponseValidator(),
        new ConfigService({ worker: { aiRetryAttempts: 3, aiRetryDelayMs: 1 } }),
      );
      await expect(service.generate(request)).rejects.toThrow(message);
      expect(provider.generate).toHaveBeenCalledOnce();
    },
  );

  it.each(['HTTP 429', 'timeout', 'AbortError', 'ECONNRESET'])(
    'retries temporary error: %s',
    async (message) => {
      const provider = { generate: vi.fn().mockRejectedValue(new Error(message)) };
      const service = new AIService(
        provider as never,
        new AIResponseValidator(),
        new ConfigService({ worker: { aiRetryAttempts: 2, aiRetryDelayMs: 1 } }),
      );
      await expect(service.generate(request)).rejects.toThrow(message);
      expect(provider.generate).toHaveBeenCalledTimes(2);
    },
  );

  it('exposes a stream-compatible response API', async () => {
    const service = new AIService(
      { generate: vi.fn().mockResolvedValue({ content: '{"issues":[]}' }) } as never,
      new AIResponseValidator(),
    );
    const responses = [];
    for await (const response of service.stream(request)) responses.push(response);
    expect(responses).toHaveLength(1);
  });

  it('limits concurrent provider calls', async () => {
    let active = 0;
    let peak = 0;
    const provider = {
      generate: vi.fn(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return { content: '{"issues":[]}' };
      }),
    };
    const service = new AIService(
      provider as never,
      new AIResponseValidator(),
      new ConfigService({ worker: { aiMaxConcurrency: 2 } }),
    );
    await Promise.all(Array.from({ length: 6 }, () => service.generate(request)));
    expect(peak).toBe(2);
  });
});

describe('OmniRouterProvider HTTP contract', () => {
  it('sends bearer authorization and structured response format', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{"issues":[]}' } }],
        usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const config = new ConfigService({
      worker: {
        aiApiKey: 'secret-key',
        aiBaseUrl: 'https://router.test/v1',
        aiModel: 'deepseek-chat',
        aiTimeoutMs: 100,
      },
    });
    await expect(new OmniRouterProvider(config).generate(request)).resolves.toMatchObject({
      model: 'deepseek-chat',
      totalTokens: 5,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://router.test/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer secret-key' }),
        body: expect.stringContaining('json_object'),
      }),
    );
    vi.unstubAllGlobals();
  });

  it.each([400, 401, 429, 500, 503])('maps HTTP %s to a provider error', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
    const config = new ConfigService({
      worker: {
        aiApiKey: 'key',
        aiBaseUrl: 'https://router.test/v1',
        aiModel: 'deepseek-chat',
        aiTimeoutMs: 100,
      },
    });
    await expect(new OmniRouterProvider(config).generate(request)).rejects.toThrow(
      `AI provider HTTP ${status}`,
    );
    vi.unstubAllGlobals();
  });
});

describe('SecretRedactorService', () => {
  const redactor = new SecretRedactorService();
  it.each([
    'password="super-secret"',
    'api_key=abcdefghijklmnop',
    'access_token: abcdefghijklmnop',
    'Authorization: Bearer abcdefghijklmnopqrstuvwxyz',
    'AKIAIOSFODNN7EXAMPLE',
    'sk_live_abcdefghijklmnop',
  ])('redacts secret pattern from %s', (source) => {
    const result = redactor.redact(source);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toBe(source);
  });
});
