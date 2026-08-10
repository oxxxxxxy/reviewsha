import { Card, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { adminSdk } from '../../api/client';

export function AIPage() {
  const usage = useQuery({
    queryKey: ['admin', 'ai-usage'],
    queryFn: () => adminSdk.admin.aiUsage(),
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
    </section>
  );
}
