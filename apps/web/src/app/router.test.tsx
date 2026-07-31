import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRouter } from './router';
import { renderWithWebProviders } from '../test/render';

const routes = [
  ['/dashboard', 'Dashboard'],
  ['/projects', 'Projects'],
  ['/projects/123', 'Projects'],
  ['/reports/abc', 'Reports'],
  ['/chat', 'Chat'],
  ['/settings', 'Settings'],
  ['/login', 'Login'],
] as const;

describe('AppRouter', () => {
  it.each(routes)('renders %s route', (route, heading) => {
    renderWithWebProviders(<AppRouter />, { route });
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
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
