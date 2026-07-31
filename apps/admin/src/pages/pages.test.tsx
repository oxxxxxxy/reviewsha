import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AIPage } from './AI/AIPage';
import { DashboardPage } from './Dashboard/DashboardPage';
import { LogsPage } from './Logs/LogsPage';
import { NotFoundPage } from './NotFound/NotFoundPage';
import { ProjectsPage } from './Projects/ProjectsPage';
import { QueuesPage } from './Queues/QueuesPage';
import { SettingsPage } from './Settings/SettingsPage';
import { UsersPage } from './Users/UsersPage';
import { renderWithAdminProviders } from '../test/render';

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
