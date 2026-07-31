import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage } from './LoginPage';
import { renderWithWebProviders } from '../../test/render';

describe('LoginPage', () => {
  it('renders login form', () => {
    renderWithWebProviders(<LoginPage />, { route: '/login' });
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('validates empty submit', async () => {
    renderWithWebProviders(<LoginPage />, { route: '/login' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Введите корректный email')).toBeInTheDocument();
    expect(await screen.findByText('Минимум 8 символов')).toBeInTheDocument();
  });

  it('submits valid form locally', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderWithWebProviders(<LoginPage />, { route: '/login' });
    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'strong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(spy).toHaveBeenCalledWith('Login form submitted', {
      email: 'user@example.com',
      password: 'strong-password',
    });
    spy.mockRestore();
  });
});
