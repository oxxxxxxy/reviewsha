import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppLayout } from '../../../src/layouts/AppLayout';
import { useUiStore } from '../../../src/stores/ui.store';
import { renderWithWebProviders } from '../../../src/test/render';

describe('AppLayout', () => {
  beforeEach(() => {
    useUiStore.setState({ isSidebarOpen: true, theme: 'system', isGlobalLoading: false });
  });

  it('renders nav and nested content', () => {
    renderWithWebProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<h1>Nested</h1>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );
    expect(screen.getByRole('heading', { name: 'Nested' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
  });

  it('toggles sidebar state', () => {
    renderWithWebProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<h1>Nested</h1>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(useUiStore.getState().isSidebarOpen).toBe(false);
  });
});
