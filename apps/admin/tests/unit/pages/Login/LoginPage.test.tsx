import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@reviewsha/types';

import { LoginPage } from '../../../../src/pages/Login/LoginPage';
import { renderWithAdminProviders } from '../../../../src/test/render';
import { adminSdk } from '../../../../src/api/client';
import { useAdminAuthStore } from '../../../../src/stores/auth.store';

describe('LoginPage', () => {
  beforeEach(() => {
    useAdminAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
    });
  });
  it('renders admin login form controls', () => {
    renderWithAdminProviders(<LoginPage />, { route: '/login' });

    expect(screen.getByRole('heading', { name: 'Admin Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in as admin' })).toBeInTheDocument();
  });

  it('shows validation errors for empty submit', async () => {
    renderWithAdminProviders(<LoginPage />, { route: '/login' });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in as admin' }));

    expect(await screen.findByText('Введите корректный email')).toBeInTheDocument();
    expect(await screen.findByText('Минимум 8 символов')).toBeInTheDocument();
  });

  it('submits valid form values through the SDK', async () => {
    const login = vi.spyOn(adminSdk.auth, 'login').mockResolvedValue({
      user: {
        id: 'admin',
        email: 'admin@example.com',
        role: Role.Admin,
        createdAt: '',
        updatedAt: '',
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    const user = userEvent.setup();

    renderWithAdminProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'strong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in as admin' }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'strong-password',
      }),
    );
  });
});
