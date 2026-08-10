import { Card, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { adminSdk } from '../../api/client';

export function LogDetailsPage() {
  const { id } = useParams();
  const [copied, setCopied] = useState(false);
  const log = useQuery({
    enabled: Boolean(id),
    queryKey: ['admin', 'log', id],
    queryFn: ({ signal }) => adminSdk.admin.log(id!, signal),
  });
  if (log.isLoading) return <section className="page"><h1>Log</h1><Loader label="Loading log" /></section>;
  if (log.isError || !log.data) return <section className="page"><h1>Log</h1><p role="alert">Unable to load log.</p><button onClick={() => void log.refetch()}>Retry</button></section>;
  return (
    <section className="page">
      <h1>Log details</h1>
      <Card>
        <p>{log.data.createdAt} · {log.data.level} · {log.data.service}</p>
        <p>{log.data.message}</p>
        {log.data.context ? <p>Context: {log.data.context}</p> : null}
        {log.data.requestId ? <p>Request ID: {log.data.requestId}</p> : null}
        {log.data.traceId ? <p>Trace ID: {log.data.traceId}</p> : null}
        {log.data.stack ? (
          <>
            <pre>{log.data.stack}</pre>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(log.data.stack!).then(() => setCopied(true));
              }}
            >
              {copied ? 'Copied' : 'Copy stack trace'}
            </button>
          </>
        ) : null}
      </Card>
      <Link to="/logs">Back to logs</Link>
    </section>
  );
}
