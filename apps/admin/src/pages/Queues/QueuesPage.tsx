import { EmptyState, Loader, Table } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { adminSdk } from '../../api/client';

export function QueuesPage() {
  const queues = useQuery({
    queryKey: ['admin', 'queues'],
    queryFn: () => adminSdk.admin.queueOverview(),
    refetchInterval: 5000,
  });
  if (queues.isLoading)
    return (
      <section className="page">
        <h1>Queues</h1>
        <Loader label="Loading queues" />
      </section>
    );
  if (queues.isError || !queues.data)
    return (
      <section className="page">
        <h1>Queues</h1>
        <p role="alert">Unable to load queues.</p>
        <button onClick={() => void queues.refetch()}>Retry</button>
      </section>
    );
  const rows = Object.entries(queues.data).map(([name, metrics]) => ({ name, ...metrics }));
  return (
    <section className="page">
      <h1>Queues</h1>
      {rows.length ? (
        <Table
          rows={rows}
          getRowKey={(row) => row.name}
          columns={[
            { key: 'name', header: 'Queue', render: (row) => row.name },
            { key: 'waiting', header: 'Waiting', render: (row) => row.waiting },
            { key: 'active', header: 'Active', render: (row) => row.active },
            { key: 'failed', header: 'Failed', render: (row) => row.failed },
            { key: 'completed', header: 'Completed', render: (row) => row.completed },
          ]}
        />
      ) : (
        <EmptyState title="No queues available" />
      )}
    </section>
  );
}
