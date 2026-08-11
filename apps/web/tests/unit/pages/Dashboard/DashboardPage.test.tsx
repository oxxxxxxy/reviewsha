import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../../../../src/pages/Dashboard/DashboardPage';
import { reviewshaSdk } from '../../../../src/api/client';
import { useAuthStore } from '../../../../src/stores/auth.store';
import { renderWithWebProviders } from '../../../../src/test/render';

const projects = {
  data: [
    {
      id: 'p1',
      ownerId: 'u1',
      name: 'Reviewsha',
      description: 'AI review platform',
      status: 'ACTIVE',
      visibility: 'PRIVATE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      stats: {
        analysesCount: 3,
        uploadsCount: 1,
        reportsCount: 2,
        lastAnalysisAt: '2026-01-02T00:00:00.000Z',
      },
    },
  ],
  meta: { page: 1, limit: 100, total: 1, pages: 1 },
};

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'user@example.com', displayName: 'User', role: 'USER' } as never,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isLoading: false,
    });
  });

  it('renders real project statistics and recent analyses', async () => {
    vi.spyOn(reviewshaSdk.projects, 'list').mockResolvedValue(projects as never);
    renderWithWebProviders(<DashboardPage />, { route: '/dashboard' });

    expect((await screen.findAllByText('Reviewsha')).length).toBe(2);
    expect(screen.getByText('Recent analyses')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders the empty state for a new user', async () => {
    vi.spyOn(reviewshaSdk.projects, 'list').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 100, total: 0, pages: 0 },
    } as never);
    renderWithWebProviders(<DashboardPage />, { route: '/dashboard' });

    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('No analyses yet')).toBeInTheDocument();
  });

  it('renders retry on API failure', async () => {
    vi.spyOn(reviewshaSdk.projects, 'list').mockRejectedValue(new Error('offline'));
    renderWithWebProviders(<DashboardPage />, { route: '/dashboard' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load dashboard');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
