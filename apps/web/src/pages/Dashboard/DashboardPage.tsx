import { Badge, Card, EmptyState, Grid, Loader, Page, Stack, Text } from '@reviewsha/ui';
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
    <Page className="page">
      <h1>Dashboard</h1>
      <p className="page-subtitle">Welcome, {user?.email}</p>
      <Grid className="dashboard-grid">
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
          <strong>
            {items.reduce((total, item) => total + (item.stats?.analysesCount ?? 0), 0)}
          </strong>
        </Card>
        <Card>
          <h2>Reports</h2>
          <strong>
            {items.reduce((total, item) => total + (item.stats?.reportsCount ?? 0), 0)}
          </strong>
        </Card>
      </Grid>
      <h2>Recent projects</h2>
      {items.length ? (
        <div className="project-list">
          {items.map((project) => (
            <Card key={project.id}>
              <h3>{project.name}</h3>
              <Text>{project.description || 'No description'}</Text>
              <Badge tone={project.status === 'ACTIVE' ? 'success' : 'warning'}>
                {project.status}
              </Badge>
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
      <Stack className="quick-actions">
        <Link className="action-button" to="/projects">
          New Project
        </Link>
        <Link className="action-button" to="/projects">
          Upload Project
        </Link>
      </Stack>
    </Page>
  );
}
