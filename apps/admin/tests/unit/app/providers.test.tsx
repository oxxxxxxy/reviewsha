import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppProviders, createAdminQueryClient } from '../../../src/app/providers';

function Probe() {
  return <div>providers-ready</div>;
}

describe('AppProviders', () => {
  it('renders children under all app providers', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    expect(screen.getByText('providers-ready')).toBeInTheDocument();
  });

  it('creates QueryClient with production-safe defaults', () => {
    const queryClient = createAdminQueryClient();

    expect(queryClient).toBeInstanceOf(QueryClient);
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1);
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000);
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0);
  });
});
