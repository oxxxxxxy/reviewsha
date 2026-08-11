import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AIPage } from '../../../src/pages/AI/AIPage';
import { DashboardPage } from '../../../src/pages/Dashboard/DashboardPage';
import { LogsPage } from '../../../src/pages/Logs/LogsPage';
import { NotFoundPage } from '../../../src/pages/NotFound/NotFoundPage';
import { ProjectsPage } from '../../../src/pages/Projects/ProjectsPage';
import { QueuesPage } from '../../../src/pages/Queues/QueuesPage';
import { SettingsPage } from '../../../src/pages/Settings/SettingsPage';
import { UsersPage } from '../../../src/pages/Users/UsersPage';
import { adminSdk } from '../../../src/api/client';
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
  beforeEach(() => {
    vi.spyOn(adminSdk.admin, 'overview').mockResolvedValue({
      users: 0,
      activeUsers: 0,
      projects: 0,
      archivedProjects: 0,
      analyses: 0,
      reports: 0,
      aiRequests: 0,
      aiTokens: 0,
    } as never);
    vi.spyOn(adminSdk.admin, 'users').mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 20, total: 0, pages: 0 },
    } as never);
    vi.spyOn(adminSdk.admin, 'projects').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, pages: 0 },
    } as never);
    vi.spyOn(adminSdk.admin, 'queueOverview').mockResolvedValue({} as never);
    vi.spyOn(adminSdk.admin, 'aiUsage').mockResolvedValue({
      requests: 0,
      tokens: 0,
      failures: 0,
      failuresList: [],
    } as never);
    vi.spyOn(adminSdk.admin, 'aiUsageBreakdown').mockResolvedValue({
      providers: [],
      users: [],
      projects: [],
    } as never);
    vi.spyOn(adminSdk.admin, 'logs').mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 50, total: 0, pages: 0 },
    } as never);
  });

  afterEach(() => vi.restoreAllMocks());

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
