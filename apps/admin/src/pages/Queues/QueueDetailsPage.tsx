import { Button, EmptyState, Loader, Table } from '@reviewsha/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { adminSdk } from '../../api/client';

export function QueueDetailsPage() {
  const { queueName } = useParams();
  const queryClient = useQueryClient();
  const jobs = useQuery({
    enabled: Boolean(queueName),
    queryKey: ['admin', 'queue-jobs', queueName],
    queryFn: () => adminSdk.admin.queueJobs(queueName!, { limit: 50 }),
    refetchInterval: 5000,
  });
  if (jobs.isLoading)
    return (
      <section className="page">
        <h1>Queue</h1>
        <Loader label="Loading jobs" />
      </section>
    );
  if (jobs.isError || !jobs.data)
    return (
      <section className="page">
        <h1>Queue</h1>
        <p role="alert">Unable to load jobs.</p>
        <button onClick={() => void jobs.refetch()}>Retry</button>
      </section>
    );
  const retry = async (jobId: string) => {
    await adminSdk.admin.retryJob(queueName!, jobId);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'queue-jobs', queueName] });
  };
  const remove = async (jobId: string) => {
    if (!window.confirm('Remove this job?')) return;
    await adminSdk.admin.removeJob(queueName!, jobId);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'queue-jobs', queueName] });
  };
  return (
    <section className="page">
      <h1>{queueName}</h1>
      {jobs.data.items.length ? (
        <Table
          rows={jobs.data.items}
          getRowKey={(job) => job.id}
          columns={[
            { key: 'id', header: 'Job ID', render: (job) => job.id },
            { key: 'state', header: 'Status', render: (job) => job.state },
            { key: 'attempts', header: 'Attempts', render: (job) => job.attemptsMade },
            { key: 'created', header: 'Created', render: (job) => job.createdAt },
            {
              key: 'actions',
              header: 'Actions',
              render: (job) => (
                <>
                  <Button variant="secondary" onClick={() => void retry(job.id)}>
                    Retry
                  </Button>{' '}
                  <Button variant="secondary" onClick={() => void remove(job.id)}>
                    Remove
                  </Button>
                </>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState title="No jobs found" />
      )}
    </section>
  );
}
