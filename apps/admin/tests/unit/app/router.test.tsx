import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@reviewsha/types';

import { AdminRouter, adminRoutes } from '../../../src/app/router';
import { renderWithAdminProviders } from '../../../src/test/render';
import { useAdminAuthStore } from '../../../src/stores/auth.store';
import { adminSdk } from '../../../src/api/client';

const routeCases = [
  { route: '/dashboard', heading: 'Dashboard' },
  { route: '/users', heading: 'Users' },
  { route: '/projects', heading: 'Projects' },
  { route: '/queues', heading: 'Queues' },
  { route: '/ai', heading: 'AI control center' },
  { route: '/logs', heading: 'Logs' },
  { route: '/settings', heading: 'Settings' },
  { route: '/login', heading: 'Admin Login' },
] as const;

describe('AdminRouter', () => {
  beforeEach(() => {
    vi.spyOn(adminSdk.admin, 'overview').mockResolvedValue({
      users: 0,
      activeUsers: 0,
      projects: 0,
      archivedProjects: 0,
      analyses: 0,
      reports: 0,
      aiRequests: 0,
      aiTokens: 0,
    } as never);
    vi.spyOn(adminSdk.admin, 'aiSettings').mockResolvedValue({
      provider: 'deepseek',
      baseUrl: 'http://localhost:20128/v1',
      dashboardUrl: 'http://localhost:20128',
      model: 'auto/best-coding',
      apiKeyConfigured: true,
      apiKeyMasked: 'sk-••••••••1234',
      maxTokens: 4000,
      temperature: 0.2,
      timeoutMs: 60000,
      retryAttempts: 2,
      maxConcurrency: 2,
      availableModels: ['auto/best-coding'],
      updatedAt: null,
    } as never);
    vi.spyOn(adminSdk.admin, 'aiUsage').mockResolvedValue({
      requests: 0,
      tokens: 0,
      failures: 0,
      failuresList: [],
    } as never);
    vi.spyOn(adminSdk.admin, 'aiUsageBreakdown').mockResolvedValue({
      providers: [],
      users: [],
      projects: [],
    } as never);
    useAdminAuthStore.setState({
      user: {
        id: 'admin',
        email: 'admin@example.com',
        role: Role.Admin,
        createdAt: '',
        updatedAt: '',
      },
      accessToken: null,
      refreshToken: null,
      isLoading: false,
    });
  });
  afterEach(() => vi.restoreAllMocks());
  it('declares the expected MVP routes', () => {
    expect(adminRoutes).toEqual([
      '/login',
      '/dashboard',
      '/users',
      '/users/:id',
      '/projects',
      '/projects/:id',
      '/queues',
      '/queues/:queueName',
      '/queues/:queueName/jobs/:jobId',
      '/ai',
      '/logs',
      '/logs/:id',
      '/settings',
      '/statistics',
    ]);
  });

  it.each(routeCases)('renders $heading for $route', async ({ route, heading }) => {
    renderWithAdminProviders(<AdminRouter />, { route });

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('redirects root route to dashboard', async () => {
    renderWithAdminProviders(<AdminRouter />, { route: '/' });

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders not found page for unknown routes', () => {
    renderWithAdminProviders(<AdminRouter />, { route: '/unknown-admin-route' });

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByText('Административная страница не найдена.')).toBeInTheDocument();
  });
});
