import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAiSettingsService } from '../../../../src/modules/admin/admin-ai-settings.service';

describe('AdminAiSettingsService', () => {
  const prisma = {
    systemSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
  const config = {
    get: vi.fn(() => 'unit-test-encryption-key'),
  };
  const service = new AdminAiSettingsService(prisma as never, config as never);

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.systemSetting.findUnique.mockResolvedValue(null);
    prisma.systemSetting.upsert.mockResolvedValue({
      updatedAt: new Date('2026-08-11T12:00:00.000Z'),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ data: [{ id: 'auto/best-coding' }, { id: 'deepseek-chat' }] }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
      ),
    );
  });

  afterEach(() => {
    delete process.env.AI_PROVIDER;
    delete process.env.OMNIROUTER_BASE_URL;
    delete process.env.AI_MODEL;
    delete process.env.OMNIROUTER_API_KEY;
    vi.unstubAllGlobals();
  });

  it('returns masked credentials and available models without exposing the key', async () => {
    process.env.AI_PROVIDER = 'omniroute';
    process.env.OMNIROUTER_BASE_URL = 'http://localhost:20128/v1';
    process.env.AI_MODEL = 'auto/best-coding';
    process.env.OMNIROUTER_API_KEY = 'sk-test-secret-1234';

    const result = await service.get();

    expect(result).toMatchObject({
      provider: 'omniroute',
      dashboardUrl: 'http://localhost:20128',
      model: 'auto/best-coding',
      apiKeyConfigured: true,
      apiKeyMasked: 'sk-t••••••••1234',
      availableModels: ['auto/best-coding', 'deepseek-chat'],
    });
    expect(JSON.stringify(result)).not.toContain('sk-test-secret-1234');
  });

  it('encrypts updated settings and preserves an existing key when the form is empty', async () => {
    const existing = {
      provider: 'deepseek',
      baseUrl: 'http://localhost:20128/v1',
      model: 'auto/best-coding',
      apiKey: 'sk-existing-secret',
      maxTokens: 12000,
      temperature: 0.2,
      timeoutMs: 60000,
      retryAttempts: 3,
      maxConcurrency: 3,
    };
    prisma.systemSetting.findUnique.mockResolvedValue({
      value: JSON.stringify(existing),
    });

    const result = await service.update(
      { id: 'admin-1' } as never,
      { model: 'auto/best-chat', apiKey: '   ' } as never,
    );

    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'ai.runtime' },
        update: expect.objectContaining({ updatedById: 'admin-1' }),
      }),
    );
    const call = prisma.systemSetting.upsert.mock.calls[0]![0] as {
      update: { value: string };
    };
    expect(call.update.value).toMatch(/^v1:/u);
    expect(call.update.value).not.toContain('sk-existing-secret');
    expect(result.model).toBe('auto/best-chat');
    expect(result.apiKeyMasked).toBe('sk-e••••••••cret');
  });

  it('can explicitly clear the stored API key', async () => {
    const existing = {
      provider: 'deepseek',
      baseUrl: 'http://localhost:20128/v1',
      model: 'auto/best-coding',
      apiKey: 'sk-existing-secret',
      maxTokens: 12000,
      temperature: 0.2,
      timeoutMs: 60000,
      retryAttempts: 3,
      maxConcurrency: 3,
    };
    prisma.systemSetting.findUnique.mockResolvedValue({
      value: JSON.stringify(existing),
    });

    const result = await service.update({ id: 'admin-1' } as never, { clearApiKey: true } as never);

    expect(result.apiKeyConfigured).toBe(false);
    expect(result.apiKeyMasked).toBeNull();
  });

  it('reports a reachable OmniRoute gateway and its active model', async () => {
    process.env.OMNIROUTER_BASE_URL = 'http://localhost:20128/v1';
    process.env.AI_MODEL = 'auto/best-coding';

    await expect(service.testConnection()).resolves.toMatchObject({
      ok: true,
      modelsCount: 2,
      model: 'auto/best-coding',
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:20128/v1/models',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
