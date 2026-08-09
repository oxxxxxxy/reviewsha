import { useQuery } from '@tanstack/react-query';
import { EmptyState, Loader, Table } from '@reviewsha/ui';
import { adminSdk } from '../../api/client';

export function ProjectsPage() {
  const projects = useQuery({
    queryKey: ['admin', 'projects'],
    queryFn: () => adminSdk.admin.projects({ limit: 20 }),
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
      {rows.length ? (
        <Table
          rows={rows}
          getRowKey={(project) => project.id}
          columns={[
            { key: 'name', header: 'Name', render: (project) => project.name },
            { key: 'status', header: 'Status', render: (project) => project.status },
            { key: 'updated', header: 'Updated', render: (project) => project.updatedAt },
          ]}
        />
      ) : (
        <EmptyState title="No projects found" />
      )}
    </section>
  );
}
