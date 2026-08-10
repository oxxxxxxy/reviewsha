import { Card, EmptyState, Loader, Table } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminSdk } from '../../api/client';

export function AIPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const params = {
    ...(from ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59.999Z`).toISOString() } : {}),
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
  };
  const usage = useQuery({
    queryKey: ['admin', 'ai-usage', params],
    queryFn: () => adminSdk.admin.aiUsage(params),
  });
  const breakdown = useQuery({
    queryKey: ['admin', 'ai-usage', 'breakdown', params],
    queryFn: () => adminSdk.admin.aiUsageBreakdown(params),
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
      <fieldset className="filters">
        <legend>Filters</legend>
        <label>
          From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>{' '}
        <label>
          To <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>{' '}
        <label>
          Provider <input value={provider} onChange={(event) => setProvider(event.target.value)} />
        </label>{' '}
        <label>
          Model <input value={model} onChange={(event) => setModel(event.target.value)} />
        </label>
      </fieldset>
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
      <h2>Recent failures</h2>
      {usage.data.failuresList.length ? (
        <Table
          rows={usage.data.failuresList}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'provider', header: 'Provider', render: (row) => row.provider },
            { key: 'model', header: 'Model', render: (row) => row.model },
            { key: 'project', header: 'Project', render: (row) => row.project ?? '—' },
            { key: 'error', header: 'Error', render: (row) => row.error ?? 'Unknown error' },
            { key: 'latency', header: 'Latency', render: (row) => row.latencyMs ?? '—' },
          ]}
        />
      ) : (
        <EmptyState title="No AI failures for selected period" />
      )}
    </section>
  );
}
