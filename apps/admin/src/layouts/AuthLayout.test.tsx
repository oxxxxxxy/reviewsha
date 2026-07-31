import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthLayout } from './AuthLayout';
import { renderWithAdminProviders } from '../test/render';

describe('AuthLayout', () => {
  it('renders brand and nested auth content', () => {
    renderWithAdminProviders(
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<h1>Nested Login</h1>} />
        </Route>
      </Routes>,
      { route: '/login' },
    );

    expect(screen.getByText('Ревьюша Admin')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nested Login' })).toBeInTheDocument();
  });
});
