import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { createAdminQueryClient } from '../app/providers';

type AdminRenderOptions = RenderOptions & {
  route?: string;
  queryClient?: QueryClient;
};

export function renderWithAdminProviders(
  ui: ReactElement,
  { route = '/', queryClient = createAdminQueryClient(), ...options }: AdminRenderOptions = {},
) {
  window.history.pushState({}, 'Admin test route', route);

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}
