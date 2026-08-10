import { Card, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminSdk } from '../../api/client';

export function StatisticsPage() {
  const [period, setPeriod] = useState('30');
  const from = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000).toISOString();
  const statistics = useQuery({
    queryKey: ['admin', 'statistics', period],
    queryFn: () => adminSdk.admin.statistics({ from }),
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
      <label>
        Period
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="1">Today</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
        </select>
      </label>
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
