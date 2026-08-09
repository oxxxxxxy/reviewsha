import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRouter } from '../../../src/app/router';
import { renderWithWebProviders } from '../../../src/test/render';
import { useAuthStore } from '../../../src/stores/auth.store';
import { reviewshaSdk } from '../../../src/api/client';

const routes = [
  ['/dashboard', 'Dashboard'],
  ['/projects', 'Projects'],
  ['/projects/123', 'Project'],
  ['/reports/abc', 'Reports'],
  ['/chat', 'Chat'],
  ['/settings', 'Settings'],
  ['/login', 'Login'],
] as const;

describe('AppRouter', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'user@example.com', displayName: 'User', role: 'USER' } as never,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isLoading: false,
    });
    vi.spyOn(reviewshaSdk.projects, 'list').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 5, total: 0, pages: 0 },
    } as never);
    vi.spyOn(reviewshaSdk.projects, 'get').mockResolvedValue({
      data: {
        id: '123',
        name: 'Project',
        description: '',
        status: 'ACTIVE',
        tags: [],
        stats: { analysesCount: 0, uploadsCount: 0, reportsCount: 0 },
        createdAt: '',
        updatedAt: '',
      },
    } as never);
    vi.spyOn(reviewshaSdk.reports, 'list').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, pages: 0 },
    } as never);
  });
  afterEach(() => vi.restoreAllMocks());
  it.each(routes)('renders %s route', async (route, heading) => {
    if (route === '/login') {
      useAuthStore.setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
      });
    }
    renderWithWebProviders(<AppRouter />, { route });
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('redirects root to dashboard', async () => {
    renderWithWebProviders(<AppRouter />, { route: '/' });
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders not found route', () => {
    renderWithWebProviders(<AppRouter />, { route: '/missing' });
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
  });
});
