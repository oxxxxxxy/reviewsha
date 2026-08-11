import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reviewshaSdk } from '../../../../src/api/client';
import { ReportsPage } from '../../../../src/pages/Reports/ReportsPage';
import { renderWithWebProviders } from '../../../../src/test/render';

const projects = {
  data: [
    {
      id: 'p1',
      ownerId: 'u1',
      name: 'Reviewsha',
      description: 'AI review platform',
      status: 'ACTIVE',
      visibility: 'PRIVATE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      stats: { analysesCount: 3, uploadsCount: 1, reportsCount: 2, lastAnalysisAt: null },
    },
    {
      id: 'p2',
      ownerId: 'u1',
      name: 'Website',
      description: 'Marketing website',
      status: 'ACTIVE',
      visibility: 'PRIVATE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      stats: { analysesCount: 1, uploadsCount: 1, reportsCount: 1, lastAnalysisAt: null },
    },
  ],
  meta: { page: 1, limit: 100, total: 2, pages: 1 },
};

describe('ReportsPage project chooser', () => {
  beforeEach(() => {
    vi.spyOn(reviewshaSdk.projects, 'list').mockResolvedValue(projects as never);
  });

  it('renders a useful project report list with report statistics', async () => {
    renderWithWebProviders(<ReportsPage />, { route: '/reports' });

    expect(await screen.findByText('Workspace insights')).toBeInTheDocument();
    const summary = screen.getByLabelText('Reviewsha report summary');
    expect(within(summary).getByText('2')).toBeInTheDocument();
    expect(summary).not.toHaveTextContent('analyses');
    expect(screen.getAllByRole('button', { name: /View reports/i })).toHaveLength(2);
  });

  it('filters projects by name', async () => {
    renderWithWebProviders(<ReportsPage />, { route: '/reports' });
    const search = await screen.findByRole('textbox', { name: 'Search projects for reports' });

    fireEvent.change(search, { target: { value: 'website' } });

    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.queryByText('Reviewsha')).not.toBeInTheDocument();
  });
});
