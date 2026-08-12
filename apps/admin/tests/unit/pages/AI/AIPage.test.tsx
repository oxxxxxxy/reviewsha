import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminSdk } from '../../../../src/api/client';
import { AIPage } from '../../../../src/pages/AI/AIPage';
import { renderWithAdminProviders } from '../../../../src/test/render';

const settings = {
  provider: 'omniroute',
  baseUrl: 'http://localhost:20128/v1',
  dashboardUrl: 'http://localhost:20128',
  model: 'auto/best-coding',
  apiKeyConfigured: true,
  apiKeyMasked: 'sk-t••••••••1234',
  maxTokens: 4000,
  temperature: 0.2,
  timeoutMs: 60000,
  retryAttempts: 3,
  maxConcurrency: 3,
  availableModels: ['auto/best-coding', 'auto/best-chat'],
  updatedAt: null,
};

describe('AIPage', () => {
  beforeEach(() => {
    vi.spyOn(adminSdk.admin, 'aiSettings').mockResolvedValue(settings as never);
    vi.spyOn(adminSdk.admin, 'aiUsage').mockResolvedValue({
      requests: 2,
      tokens: 100,
      failures: 0,
      failuresList: [],
    } as never);
    vi.spyOn(adminSdk.admin, 'aiUsageBreakdown').mockResolvedValue({
      providers: [],
      users: [],
      projects: [],
    } as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads gateway settings, changes the active model and saves them', async () => {
    const update = vi.spyOn(adminSdk.admin, 'updateAiSettings').mockResolvedValue({
      ...settings,
      model: 'auto/best-chat',
    } as never);

    renderWithAdminProviders(<AIPage />);

    expect(await screen.findByRole('heading', { name: 'AI control center' })).toBeInTheDocument();
    expect(screen.getByText('Stored key: sk-t••••••••1234')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Or enter model'), {
      target: { value: 'auto/best-chat' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save AI settings' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'omniroute',
          model: 'auto/best-chat',
          apiKey: undefined,
        }),
      ),
    );
  });

  it('tests the configured OmniRoute connection from the control center', async () => {
    const testConnection = vi.spyOn(adminSdk.admin, 'testAiConnection').mockResolvedValue({
      ok: true,
      message: 'OmniRoute is reachable.',
      modelsCount: 2,
      latencyMs: 12,
      model: 'auto/best-coding',
    } as never);

    renderWithAdminProviders(<AIPage />);
    await screen.findByRole('heading', { name: 'AI control center' });
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));

    await waitFor(() => expect(testConnection).toHaveBeenCalledOnce());
    expect(await screen.findByText(/OmniRoute is reachable/u)).toBeInTheDocument();
  });

  it('saves the configured parallel OmniRoute request limit', async () => {
    const update = vi
      .spyOn(adminSdk.admin, 'updateAiSettings')
      .mockResolvedValue(settings as never);

    renderWithAdminProviders(<AIPage />);
    await screen.findByRole('heading', { name: 'AI control center' });

    fireEvent.change(screen.getByDisplayValue('3'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save AI settings' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ maxConcurrency: 2 })),
    );
  });
});
