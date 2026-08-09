import { Card, EmptyState, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reviewshaSdk } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const projects = useQuery({
    queryKey: ['projects', 'dashboard'],
    queryFn: () => reviewshaSdk.projects.list({ limit: 5, sort: 'updatedAt', order: 'desc' }),
  });
  if (projects.isLoading) return <Loader label="Loading dashboard" />;
  if (projects.isError)
    return (
      <section className="page">
        <h1>Dashboard</h1>
        <p role="alert">Unable to load dashboard.</p>
        <button onClick={() => void projects.refetch()}>Retry</button>
      </section>
    );
  const items = projects.data?.data ?? [];
  return (
    <section className="page">
      <h1>Welcome, {user?.email}</h1>
      <div className="dashboard-grid">
        <Card>
          <h2>Projects</h2>
          <strong>{projects.data?.meta.total ?? 0}</strong>
        </Card>
        <Card>
          <h2>Recent projects</h2>
          <strong>{items.length}</strong>
        </Card>
        <Card>
          <h2>Analyses</h2>
          <span>Available in project reports</span>
        </Card>
        <Card>
          <h2>Reports</h2>
          <span>Open a project to view</span>
        </Card>
      </div>
      <h2>Recent projects</h2>
      {items.length ? (
        <div className="project-list">
          {items.map((project) => (
            <Card key={project.id}>
              <h3>{project.name}</h3>
              <p>{project.description || 'No description'}</p>
              <Link to={`/projects/${project.id}`}>View project</Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create your first project to begin a review."
        />
      )}
      <div className="quick-actions">
        <Link to="/projects">New Project</Link>
        <Link to="/projects">Upload Project</Link>
      </div>
    </section>
  );
}
