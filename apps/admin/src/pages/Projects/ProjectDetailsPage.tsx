import { Card, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { adminSdk } from '../../api/client';

export function ProjectDetailsPage() {
  const { id } = useParams();
  const project = useQuery({
    enabled: Boolean(id),
    queryKey: ['admin', 'project', id],
    queryFn: () => adminSdk.admin.project(id!),
  });
  if (project.isLoading)
    return (
      <section className="page">
        <h1>Project</h1>
        <Loader label="Loading project" />
      </section>
    );
  if (project.isError || !project.data)
    return (
      <section className="page">
        <h1>Project</h1>
        <p role="alert">Unable to load project.</p>
        <button onClick={() => void project.refetch()}>Retry</button>
      </section>
    );
  const item = project.data.data;
  return (
    <section className="page">
      <h1>Project</h1>
      <Card>
        <h2>{item.name}</h2>
        <p>{item.description ?? 'No description.'}</p>
        <p>Status: {item.status}</p>
        <p>Owner ID: {item.ownerId}</p>
        <p>Updated: {item.updatedAt}</p>
      </Card>
      <Link to="/projects">Back to projects</Link>
    </section>
  );
}
