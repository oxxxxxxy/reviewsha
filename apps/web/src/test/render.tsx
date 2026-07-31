import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { createWebQueryClient } from '../app/providers';

type WebRenderOptions = RenderOptions & {
  route?: string;
  queryClient?: QueryClient;
};

export function renderWithWebProviders(
  ui: ReactElement,
  { route = '/', queryClient = createWebQueryClient(), ...options }: WebRenderOptions = {},
) {
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
