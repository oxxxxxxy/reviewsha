import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Grid,
  Page,
  Skeleton,
  Stack,
  Text,
} from '@reviewsha/ui';
import { Link } from 'react-router-dom';
import { useDashboardProjects } from '../../features/dashboard/dashboard.queries';
import { useAuthStore } from '../../stores/auth.store';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const projects = useDashboardProjects();
  if (projects.isLoading)
    return (
      <Page className="page">
        <Skeleton className="dashboard-title-skeleton" />
        <Grid className="dashboard-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index}>
              <Skeleton className="dashboard-card-skeleton" />
            </Card>
          ))}
        </Grid>
        <Skeleton className="dashboard-list-skeleton" />
      </Page>
    );
  if (projects.isError)
    return (
      <Page className="page">
        <h1>Dashboard</h1>
        <Alert>Unable to load dashboard.</Alert>
        <Button onClick={() => void projects.refetch()}>Retry</Button>
      </Page>
    );
  const items = projects.data?.data ?? [];
  const analyses = items.reduce((total, item) => total + (item.stats?.analysesCount ?? 0), 0);
  const reports = items.reduce((total, item) => total + (item.stats?.reportsCount ?? 0), 0);
  const recentProjects = items.slice(0, 4);
  const recentAnalyses = items.filter((item) => item.stats?.lastAnalysisAt).slice(0, 4);
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
          <h2>Analyses</h2>
          <strong>{analyses}</strong>
        </Card>
        <Card>
          <h2>Reports</h2>
          <strong>{reports}</strong>
        </Card>
        <Card>
          <h2>Average score</h2>
          <strong aria-label="Average score is not available">—</strong>
        </Card>
      </Grid>
      <h2>Recent projects</h2>
      {items.length ? (
        <div className="project-list">
          {recentProjects.map((project) => (
            <Card
              key={project.id}
              className="project-card"
              role="link"
              tabIndex={0}
              onClick={() => (window.location.href = `/projects/${project.id}`)}
            >
              <h3>{project.name}</h3>
              <Text>{project.description || 'No description'}</Text>
              <Button
                className="action-button"
                onClick={(event) => {
                  event.stopPropagation();
                  window.location.href = `/projects/${project.id}`;
                }}
              >
                View project
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create your first project to begin a review."
        />
      )}
      <h2>Recent analyses</h2>
      {recentAnalyses.length ? (
        <div className="project-list">
          {recentAnalyses.map((project) => (
            <Card
              key={project.id}
              className="analysis-row project-card"
              role="link"
              tabIndex={0}
              onClick={() => (window.location.href = `/projects/${project.id}`)}
            >
              <div>
                <h3>{project.name}</h3>
                <Text>{new Date(project.stats!.lastAnalysisAt!).toLocaleString()}</Text>
              </div>
              <Badge tone="success">COMPLETED</Badge>
              <span>Score: —</span>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No analyses yet"
          description="Upload a project to start your first analysis."
        />
      )}
      <Stack className="quick-actions">
        <Link className="action-button" to="/projects">
          New Project
        </Link>
        <Link className="action-button" to="/projects">
          Upload Project
        </Link>
        <Link className="action-button" to="/reports">
          View Reports
        </Link>
      </Stack>
    </Page>
  );
}
