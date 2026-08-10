import { Card, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { adminSdk } from '../../api/client';

export function StatisticsPage() {
  const statistics = useQuery({
    queryKey: ['admin', 'statistics'],
    queryFn: () => adminSdk.admin.statistics(),
  });
  if (statistics.isLoading)
    return (
      <section className="page">
        <h1>Statistics</h1>
        <Loader label="Loading statistics" />
      </section>
    );
  if (statistics.isError || !statistics.data)
    return (
      <section className="page">
        <h1>Statistics</h1>
        <p role="alert">Unable to load statistics.</p>
        <button onClick={() => void statistics.refetch()}>Retry</button>
      </section>
    );
  const cards = [
    ['Users', statistics.data.users],
    ['Projects', statistics.data.projects],
    ['Analyses', statistics.data.analyses],
    ['Completed', statistics.data.completedAnalyses],
    ['Failed', statistics.data.failedAnalyses],
  ];
  return (
    <section className="page">
      <h1>Statistics</h1>
      <div className="project-list">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <strong>{label}</strong>
            <p>{value}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
