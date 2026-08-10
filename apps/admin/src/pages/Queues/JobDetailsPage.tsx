import { Card, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { adminSdk } from '../../api/client';

export function JobDetailsPage() {
  const { queueName, jobId } = useParams();
  const job = useQuery({
    enabled: Boolean(queueName && jobId),
    queryKey: ['admin', 'queue-job', queueName, jobId],
    queryFn: () => adminSdk.admin.queueJob(queueName!, jobId!),
  });
  if (job.isLoading) return <Loader label="Loading job" />;
  if (job.isError || !job.data)
    return (
      <section className="page">
        <h1>Job</h1>
        <p role="alert">Unable to load job.</p>
        <button onClick={() => void job.refetch()}>Retry</button>
      </section>
    );
  return (
    <section className="page">
      <h1>Job details</h1>
      <Card>
        <p>ID: {job.data.id}</p>
        <p>Queue: {queueName}</p>
        <p>Name: {job.data.name}</p>
        <p>Status: {job.data.state}</p>
        <p>Attempts: {job.data.attemptsMade}</p>
        <p>Created: {job.data.createdAt}</p>
        <p>Started: {job.data.processedOn ?? '—'}</p>
        <p>Finished: {job.data.finishedOn ?? '—'}</p>
        {job.data.failedReason ? <p role="alert">Error: {job.data.failedReason}</p> : null}
      </Card>
      <Link to={`/queues/${queueName}`}>Back to queue</Link>
    </section>
  );
}
