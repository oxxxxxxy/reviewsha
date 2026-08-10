import { Card, EmptyState, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { adminSdk } from '../../api/client';

export function DashboardPage() {
  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => adminSdk.admin.overview(),
  });
  if (overview.isLoading)
    return (
      <section className="page">
        <h1>Dashboard</h1>
        <Loader label="Loading dashboard" />
      </section>
    );
  if (overview.isError || !overview.data)
    return (
      <section className="page">
        <h1>Dashboard</h1>
        <p role="alert">Unable to load dashboard.</p>
        <button onClick={() => void overview.refetch()}>Retry</button>
      </section>
    );
  const cards = [
    ['Users', overview.data.users],
    ['Active users', overview.data.activeUsers],
    ['Projects', overview.data.projects],
    ['Archived projects', overview.data.archivedProjects],
    ['Analyses', overview.data.analyses],
    ['Reports', overview.data.reports],
    ['AI requests', overview.data.aiRequests],
    ['AI tokens', overview.data.aiTokens],
  ];
  return (
    <section className="page">
      <h1>Dashboard</h1>
      {cards.length ? (
        <div className="project-list">
          {cards.map(([label, value]) => (
            <Card key={label}>
              <strong>{label}</strong>
              <p>{value}</p>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No statistics available" />
      )}
    </section>
  );
}
