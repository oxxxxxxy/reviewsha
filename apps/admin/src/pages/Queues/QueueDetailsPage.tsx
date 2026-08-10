import { Button, EmptyState, Loader, Modal, Select, Table } from '@reviewsha/ui';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { adminSdk } from '../../api/client';

export function QueueDetailsPage() {
  const { queueName } = useParams();
  const [page, setPage] = useState(1);
  const [state, setState] = useState('');
  const [removeJobId, setRemoveJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const jobs = useQuery({
    enabled: Boolean(queueName),
    queryKey: ['admin', 'queue-jobs', queueName, page, state],
    queryFn: () =>
      adminSdk.admin.queueJobs(queueName!, { page, limit: 20, ...(state ? { state } : {}) }),
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
    await adminSdk.admin.removeJob(queueName!, jobId);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'queue-jobs', queueName] });
    setRemoveJobId(null);
  };
  return (
    <section className="page">
      <h1>{queueName}</h1>
      <Select
        label="Status"
        value={state}
        onChange={(event) => {
          setState(event.target.value);
          setPage(1);
        }}
        options={[
          { value: '', label: 'All statuses' },
          { value: 'waiting', label: 'Waiting' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
          { value: 'failed', label: 'Failed' },
          { value: 'delayed', label: 'Delayed' },
          { value: 'paused', label: 'Paused' },
        ]}
      />
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
                  <Button variant="secondary" onClick={() => setRemoveJobId(job.id)}>
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
      {jobs.data.meta.pages > 1 ? (
        <nav aria-label="Queue jobs pagination">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>{' '}
          <span>
            Page {jobs.data.meta.page} of {jobs.data.meta.pages}
          </span>{' '}
          <Button
            variant="secondary"
            disabled={page >= jobs.data.meta.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
      <Modal
        isOpen={Boolean(removeJobId)}
        title="Remove queue job?"
        onClose={() => setRemoveJobId(null)}
      >
        <p>This action cannot be undone.</p>
        <Button variant="secondary" onClick={() => setRemoveJobId(null)}>
          Cancel
        </Button>{' '}
        <Button onClick={() => (removeJobId ? void remove(removeJobId) : undefined)}>Remove</Button>
      </Modal>
    </section>
  );
}
