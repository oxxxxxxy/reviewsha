import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, EmptyState, Input, Loader, Table } from '@reviewsha/ui';
import { useState } from 'react';
import { adminSdk } from '../../api/client';

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const projects = useQuery({
    queryKey: ['admin', 'projects', search, page],
    queryFn: () => adminSdk.admin.projects({ limit: 20, page, search: search || undefined }),
  });
  if (projects.isLoading)
    return (
      <section className="page">
        <h1>Projects</h1>
        <Loader label="Loading projects" />
      </section>
    );
  if (projects.isError)
    return (
      <section className="page">
        <h1>Projects</h1>
        <p role="alert">
          Unable to load projects. <button onClick={() => void projects.refetch()}>Retry</button>
        </p>
      </section>
    );
  const rows = projects.data?.data ?? [];
  return (
    <section className="page">
      <h1>Projects</h1>
      <Input
        aria-label="Search projects"
        placeholder="Search projects"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      {rows.length ? (
        <Table
          rows={rows}
          getRowKey={(project) => project.id}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (project) => <Link to={`/projects/${project.id}`}>{project.name}</Link>,
            },
            { key: 'status', header: 'Status', render: (project) => project.status },
            { key: 'updated', header: 'Updated', render: (project) => project.updatedAt },
          ]}
        />
      ) : (
        <EmptyState title="No projects found" />
      )}
      {projects.data && projects.data.meta.pages > 1 ? (
        <nav aria-label="Project pages">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>{' '}
          <span>
            Page {page} of {projects.data.meta.pages}
          </span>{' '}
          <Button
            variant="secondary"
            disabled={page >= projects.data.meta.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </section>
  );
}
