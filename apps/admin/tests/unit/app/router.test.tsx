import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Role } from '@reviewsha/types';

import { AdminRouter, adminRoutes } from '../../../src/app/router';
import { renderWithAdminProviders } from '../../../src/test/render';
import { useAdminAuthStore } from '../../../src/stores/auth.store';

const routeCases = [
  { route: '/dashboard', heading: 'Dashboard' },
  { route: '/users', heading: 'Users' },
  { route: '/projects', heading: 'Projects' },
  { route: '/queues', heading: 'Queues' },
  { route: '/ai', heading: 'AI' },
  { route: '/logs', heading: 'Logs' },
  { route: '/settings', heading: 'Settings' },
  { route: '/login', heading: 'Admin Login' },
] as const;

describe('AdminRouter', () => {
  beforeEach(() => {
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

  it.each(routeCases)('renders $heading for $route', ({ route, heading }) => {
    renderWithAdminProviders(<AdminRouter />, { route });

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
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
