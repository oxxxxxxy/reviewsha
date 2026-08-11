import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdminLayout, adminNavItems } from '../../../src/layouts/AdminLayout';
import { useAdminUiStore } from '../../../src/stores/ui.store';
import { renderWithAdminProviders } from '../../../src/test/render';

describe('AdminLayout', () => {
  beforeEach(() => {
    useAdminUiStore.getState().reset();
  });

  it('renders sidebar, header and nested page content', () => {
    renderWithAdminProviders(
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<h1>Nested Dashboard</h1>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );

    expect(screen.getByLabelText('Admin sidebar')).toBeInTheDocument();
    expect(screen.getByText('Control center')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nested Dashboard' })).toBeInTheDocument();
  });

  it('renders all admin navigation links', () => {
    renderWithAdminProviders(
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<h1>Dashboard</h1>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );

    for (const item of adminNavItems) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.to);
    }
  });

  it('toggles sidebar state from the layout button', () => {
    renderWithAdminProviders(
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<h1>Dashboard</h1>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );

    expect(useAdminUiStore.getState().isSidebarOpen).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(useAdminUiStore.getState().isSidebarOpen).toBe(false);
  });
});
