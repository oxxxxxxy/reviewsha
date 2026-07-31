import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppProviders, createWebQueryClient } from './providers';

describe('AppProviders', () => {
  it('renders children', () => {
    render(
      <AppProviders>
        <div>ready</div>
      </AppProviders>,
    );
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('creates QueryClient with expected defaults', () => {
    const client = createWebQueryClient();
    expect(client).toBeInstanceOf(QueryClient);
    expect(client.getDefaultOptions().queries?.retry).toBe(1);
    expect(client.getDefaultOptions().queries?.staleTime).toBe(30_000);
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });
});
