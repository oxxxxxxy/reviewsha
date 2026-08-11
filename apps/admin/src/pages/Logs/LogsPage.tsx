import { EmptyState, Input, Loader, Table } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { adminSdk } from '../../api/client';

export function LogsPage() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [service, setService] = useState('');
  const [event, setEvent] = useState('');
  const [requestId, setRequestId] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const logs = useQuery({
    queryKey: ['admin', 'logs', search, level, service, event, requestId, userId, from, to],
    queryFn: () =>
      adminSdk.admin.logs({
        limit: 50,
        search: search || undefined,
        level: level || undefined,
        service: service || undefined,
        event: event || undefined,
        requestId: requestId || undefined,
        userId: userId || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });
  if (logs.isLoading) return <section className="page"><h1>Logs</h1><Loader label="Loading logs" /></section>;
  if (logs.isError || !logs.data) return <section className="page"><h1>Logs</h1><p role="alert">Unable to load logs.</p><button onClick={() => void logs.refetch()}>Retry</button></section>;
  const rows = logs.data.items;
  return (
    <section className="page">
      <h1>Logs</h1>
      <Input aria-label="Search logs" placeholder="Search logs" value={search} onChange={(event) => setSearch(event.target.value)} />
      <Input aria-label="Filter log level" placeholder="Level (ERROR)" value={level} onChange={(event) => setLevel(event.target.value)} />
      <Input aria-label="Filter log service" placeholder="Service (API)" value={service} onChange={(event) => setService(event.target.value)} />
      <Input aria-label="Filter log event" placeholder="Event (chat.generation.failed)" value={event} onChange={(inputEvent) => setEvent(inputEvent.target.value)} />
      <Input aria-label="Filter log request" placeholder="Request ID" value={requestId} onChange={(inputEvent) => setRequestId(inputEvent.target.value)} />
      <Input aria-label="Filter log user" placeholder="User ID" value={userId} onChange={(inputEvent) => setUserId(inputEvent.target.value)} />
      <label>From <Input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value ? new Date(event.target.value).toISOString() : '')} /></label>
      <label>To <Input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value ? new Date(event.target.value).toISOString() : '')} /></label>
      {rows.length ? <Table rows={rows} getRowKey={(row) => row.id} columns={[
        { key: 'createdAt', header: 'Timestamp', render: (row) => row.createdAt },
        { key: 'level', header: 'Level', render: (row) => row.level },
        { key: 'service', header: 'Service', render: (row) => row.service },
        { key: 'event', header: 'Event', render: (row) => row.event ?? '—' },
        { key: 'message', header: 'Message', render: (row) => <Link to={`/logs/${row.id}`}>{row.message}</Link> },
      ]} /> : <EmptyState title="No logs found" />}
    </section>
  );
}
