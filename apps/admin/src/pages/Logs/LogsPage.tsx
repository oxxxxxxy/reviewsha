import { EmptyState, Loader, Table } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { adminSdk } from '../../api/client';

export function LogsPage() {
  const logs = useQuery({ queryKey: ['admin', 'logs'], queryFn: () => adminSdk.admin.logs({ limit: 50 }) });
  if (logs.isLoading) return <section className="page"><h1>Logs</h1><Loader label="Loading logs" /></section>;
  if (logs.isError || !logs.data) return <section className="page"><h1>Logs</h1><p role="alert">Unable to load logs.</p><button onClick={() => void logs.refetch()}>Retry</button></section>;
  const rows = logs.data.items;
  return (
    <section className="page">
      <h1>Logs</h1>
      {rows.length ? <Table rows={rows} getRowKey={(row) => row.id} columns={[
        { key: 'createdAt', header: 'Timestamp', render: (row) => row.createdAt },
        { key: 'level', header: 'Level', render: (row) => row.level },
        { key: 'service', header: 'Service', render: (row) => row.service },
        { key: 'message', header: 'Message', render: (row) => row.message },
      ]} /> : <EmptyState title="No logs found" />}
    </section>
  );
}
