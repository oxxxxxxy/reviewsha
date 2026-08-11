import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { ProjectsPage } from '../../../../src/pages/Projects/ProjectsPage';
import { reviewshaSdk } from '../../../../src/api/client';
import { renderWithWebProviders } from '../../../../src/test/render';

const project = {
  id: 'project-1',
  ownerId: 'user-1',
  name: 'Reviewsha',
  description: 'Code review workspace',
  status: 'ACTIVE',
  visibility: 'PRIVATE',
  language: 'TypeScript',
  tags: ['security'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.spyOn(reviewshaSdk.projects, 'list').mockResolvedValue({
      data: [project],
      meta: { page: 1, limit: 20, total: 1, pages: 1 },
    } as never);
    vi.spyOn(reviewshaSdk.projects, 'remove').mockResolvedValue(undefined as never);
  });

  it('uses an accessible confirmation modal before deleting a project', async () => {
    renderWithWebProviders(<ProjectsPage />, { route: '/projects' });

    expect(await screen.findByRole('heading', { name: 'Reviewsha' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Delete this project?');
    expect(reviewshaSdk.projects.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete project' }));
    await waitFor(() => expect(reviewshaSdk.projects.remove).toHaveBeenCalledWith('project-1'));
  });

  it('shows the server validation reason when an upload is rejected', async () => {
    vi.spyOn(reviewshaSdk.projects, 'get').mockResolvedValue({ data: project } as never);
    vi.spyOn(reviewshaSdk.uploads, 'list').mockResolvedValue({ data: [] } as never);
    vi.spyOn(reviewshaSdk.analyses, 'list').mockResolvedValue({ data: [] } as never);
    vi.spyOn(reviewshaSdk.uploads, 'upload').mockRejectedValue(
      new Error('Archive contains a forbidden path'),
    );

    const { container } = renderWithWebProviders(
      <Routes>
        <Route path="/projects/:id" element={<ProjectsPage />} />
      </Routes>,
      {
        route: '/projects/project-1',
      },
    );
    await screen.findByRole('heading', { name: 'Reviewsha' });
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    fireEvent.change(input!, {
      target: { files: [new File(['content'], 'project.zip', { type: 'application/zip' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Archive contains a forbidden path');
  });

  it('offers stack suggestions and renders selected technologies as removable chips', async () => {
    renderWithWebProviders(<ProjectsPage />, { route: '/projects' });

    const input = await screen.findByRole('textbox', { name: 'Project technologies and tags' });
    fireEvent.focus(input);

    expect(screen.getByRole('listbox', { name: 'Technology suggestions' })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'React' } });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'React' }));

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove React' })).toBeInTheDocument();
  });
});
