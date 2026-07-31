import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminRouter, adminRoutes } from './router';
import { renderWithAdminProviders } from '../test/render';

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
  it('declares the expected MVP routes', () => {
    expect(adminRoutes).toEqual([
      '/login',
      '/dashboard',
      '/users',
      '/projects',
      '/queues',
      '/ai',
      '/logs',
      '/settings',
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
