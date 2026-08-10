import { Card, EmptyState, Loader, Table } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { adminSdk } from '../../api/client';

export function AIPage() {
  const usage = useQuery({
    queryKey: ['admin', 'ai-usage'],
    queryFn: () => adminSdk.admin.aiUsage(),
  });
  const breakdown = useQuery({
    queryKey: ['admin', 'ai-usage', 'breakdown'],
    queryFn: () => adminSdk.admin.aiUsageBreakdown(),
  });
  if (usage.isLoading)
    return (
      <section className="page">
        <h1>AI</h1>
        <Loader label="Loading AI usage" />
      </section>
    );
  if (usage.isError || !usage.data)
    return (
      <section className="page">
        <h1>AI</h1>
        <p role="alert">Unable to load AI usage.</p>
        <button onClick={() => void usage.refetch()}>Retry</button>
      </section>
    );
  return (
    <section className="page">
      <h1>AI</h1>
      <div className="project-list">
        <Card>
          <strong>Requests</strong>
          <p>{usage.data.requests}</p>
        </Card>
        <Card>
          <strong>Tokens</strong>
          <p>{usage.data.tokens}</p>
        </Card>
        <Card>
          <strong>Failures</strong>
          <p>{usage.data.failures}</p>
        </Card>
      </div>
      {breakdown.isLoading ? <Loader label="Loading AI breakdown" /> : null}
      {breakdown.isError ? <p role="alert">Unable to load AI usage breakdown.</p> : null}
      {breakdown.data ? (
        <>
          <h2>By provider</h2>
          {breakdown.data.providers.length ? (
            <Table
              rows={breakdown.data.providers}
              getRowKey={(row) => row.key}
              columns={[
                { key: 'provider', header: 'Provider', render: (row) => row.label ?? row.key },
                { key: 'requests', header: 'Requests', render: (row) => row.requests },
                { key: 'tokens', header: 'Tokens', render: (row) => row.tokens },
                { key: 'cost', header: 'Cost', render: (row) => row.cost },
              ]}
            />
          ) : (
            <EmptyState title="No provider usage" />
          )}
          <h2>By user</h2>
          {breakdown.data.users.length ? (
            <Table
              rows={breakdown.data.users}
              getRowKey={(row) => row.key}
              columns={[
                { key: 'user', header: 'User', render: (row) => row.label ?? row.key },
                { key: 'requests', header: 'Requests', render: (row) => row.requests },
                { key: 'tokens', header: 'Tokens', render: (row) => row.tokens },
              ]}
            />
          ) : (
            <EmptyState title="No user usage" />
          )}
          <h2>By project</h2>
          {breakdown.data.projects.length ? (
            <Table
              rows={breakdown.data.projects}
              getRowKey={(row) => row.key}
              columns={[
                { key: 'project', header: 'Project', render: (row) => row.label ?? row.key },
                { key: 'requests', header: 'Requests', render: (row) => row.requests },
                { key: 'tokens', header: 'Tokens', render: (row) => row.tokens },
              ]}
            />
          ) : (
            <EmptyState title="No project usage" />
          )}
        </>
      ) : null}
    </section>
  );
}
