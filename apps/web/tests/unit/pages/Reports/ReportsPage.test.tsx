import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reviewshaSdk } from '../../../../src/api/client';
import {
  buildFindingCodeContext,
  getFileFindings,
  pathsMatch,
  ReportsPage,
} from '../../../../src/pages/Reports/ReportsPage';
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

describe('report finding context', () => {
  it('keeps findings visible both in the file view and the global list', () => {
    const issues = [
      { id: '1', filePath: 'src/main.ts' },
      { id: '2', filePath: 'src/other.ts' },
    ];
    expect(getFileFindings(issues, 'project://repo/src/main.ts').map((issue) => issue.id)).toEqual([
      '1',
    ]);
  });

  it('matches file paths when one side contains the uploaded project root', () => {
    expect(pathsMatch('src/api.ts', 'project://repo/src/api.ts')).toBe(true);
    expect(pathsMatch('src/api.ts', 'src/other.ts')).toBe(false);
  });

  it('renders a replacement as a red and green line with the same line number', () => {
    const context = buildFindingCodeContext({
      line: 10,
      codeContext: {
        startLine: 8,
        endLine: 12,
        lines: [
          { line: 8, content: 'before', isTarget: false },
          { line: 9, content: 'before target', isTarget: false },
          { line: 10, content: 'bad()', isTarget: true },
          { line: 11, content: 'after target', isTarget: false },
          { line: 12, content: 'after', isTarget: false },
        ],
      },
      suggestedPatch: { before: 'bad()', after: 'good()' },
    });

    expect(context?.lines).toEqual([
      { line: 8, content: 'before', isTarget: false, kind: 'context' },
      { line: 9, content: 'before target', isTarget: false, kind: 'context' },
      { line: 10, content: 'bad()', isTarget: true, kind: 'removed' },
      { line: 10, content: 'good()', isTarget: true, kind: 'added' },
      { line: 11, content: 'after target', isTarget: false, kind: 'context' },
      { line: 12, content: 'after', isTarget: false, kind: 'context' },
    ]);
  });

  it('renders deletion and addition without creating an empty replacement line', () => {
    expect(
      buildFindingCodeContext({ line: 4, suggestedPatch: { before: 'remove()', after: '' } })
        ?.lines,
    ).toEqual([{ line: 4, content: 'remove()', isTarget: true, kind: 'removed' }]);
    expect(
      buildFindingCodeContext({ line: 5, suggestedPatch: { before: '', after: 'add()' } })?.lines,
    ).toEqual([{ line: 5, content: 'add()', isTarget: true, kind: 'added' }]);
  });
});
