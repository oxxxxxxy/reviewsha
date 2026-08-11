import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { adminSdk } from '../../../../src/api/client';
import { UserDetailsPage } from '../../../../src/pages/Users/UserDetailsPage';
import { renderWithAdminProviders } from '../../../../src/test/render';

describe('UserDetailsPage', () => {
  beforeEach(() => {
    vi.spyOn(adminSdk.admin, 'userDetails').mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        avatarUrl: null,
        role: 'USER',
        isActive: true,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      projects: [],
      activity: [],
    } as never);
    vi.spyOn(adminSdk.admin, 'updateUser').mockResolvedValue({} as never);
  });

  it('loads administrative controls and submits role/status changes through the SDK', async () => {
    const update = vi.mocked(adminSdk.admin.updateUser);
    const user = userEvent.setup();

    renderWithAdminProviders(
      <Routes>
        <Route path="/users/:id" element={<UserDetailsPage />} />
      </Routes>,
      { route: '/users/user-1' },
    );

    expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Role'), 'ADMIN');
    await user.click(screen.getByLabelText('Active'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('user-1', { role: 'ADMIN', isActive: false }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Changes saved.');
  });
});
