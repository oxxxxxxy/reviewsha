import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AIPage } from '../../../src/pages/AI/AIPage';
import { DashboardPage } from '../../../src/pages/Dashboard/DashboardPage';
import { LogsPage } from '../../../src/pages/Logs/LogsPage';
import { NotFoundPage } from '../../../src/pages/NotFound/NotFoundPage';
import { ProjectsPage } from '../../../src/pages/Projects/ProjectsPage';
import { QueuesPage } from '../../../src/pages/Queues/QueuesPage';
import { SettingsPage } from '../../../src/pages/Settings/SettingsPage';
import { UsersPage } from '../../../src/pages/Users/UsersPage';
import { renderWithAdminProviders } from '../../../src/test/render';

const pages = [
  { Component: DashboardPage, heading: 'Dashboard' },
  { Component: UsersPage, heading: 'Users' },
  { Component: ProjectsPage, heading: 'Projects' },
  { Component: QueuesPage, heading: 'Queues' },
  { Component: AIPage, heading: 'AI' },
  { Component: LogsPage, heading: 'Logs' },
  { Component: SettingsPage, heading: 'Settings' },
] as const;

describe('admin placeholder pages', () => {
  it.each(pages)('renders $heading page', ({ Component, heading }) => {
    renderWithAdminProviders(<Component />);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('renders not found page with dashboard link', () => {
    renderWithAdminProviders(<NotFoundPage />);

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Вернуться на Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
