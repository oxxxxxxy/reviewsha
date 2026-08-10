import { Card, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { adminSdk } from '../../api/client';

export function ProjectDetailsPage() {
  const { id } = useParams();
  const project = useQuery({
    enabled: Boolean(id),
    queryKey: ['admin', 'project', id],
    queryFn: () => adminSdk.admin.projectDetails(id!),
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
  const item = project.data.project;
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
      <h2>Owner</h2>
      <p>{project.data.owner.email}</p>
      <h2>Versions</h2>
      {project.data.versions.length ? (
        <ul>
          {project.data.versions.map((version) => (
            <li key={version.version}>
              v{version.version} — {version.status} — {version.size} bytes
            </li>
          ))}
        </ul>
      ) : (
        <p>No versions found.</p>
      )}
      <h2>Analyses</h2>
      {project.data.analyses.length ? (
        <ul>
          {project.data.analyses.map((analysis) => (
            <li key={analysis.id}>
              {analysis.status} — score {analysis.score ?? '—'}
            </li>
          ))}
        </ul>
      ) : (
        <p>No analyses found.</p>
      )}
      <Link to="/projects">Back to projects</Link>
    </section>
  );
}
