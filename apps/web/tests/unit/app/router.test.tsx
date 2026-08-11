import { screen, within } from '@testing-library/react';
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
  ['/chat', 'All chats'],
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
    vi.spyOn(reviewshaSdk.auth, 'me').mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      displayName: 'User',
      role: 'USER',
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

  it('keeps project actions together and removes archive/history controls', async () => {
    renderWithWebProviders(<AppRouter />, { route: '/projects/123' });

    const actions = await screen.findByRole('group', { name: 'Project actions' });
    expect(within(actions).getByRole('link', { name: 'Project settings' })).toHaveAttribute(
      'href',
      '/projects/123/settings',
    );
    expect(within(actions).getByRole('button', { name: 'Delete project' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Start analysis' })).toBeInTheDocument();
    expect(within(actions).getByRole('link', { name: 'Open reports' })).toHaveAttribute(
      'href',
      '/projects/123/reports',
    );
    expect(within(actions).getByRole('link', { name: 'Open chat' })).toHaveAttribute(
      'href',
      '/projects/123/chat',
    );
    expect(screen.queryByRole('button', { name: 'Archive project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'History' })).not.toBeInTheDocument();
  });
});
