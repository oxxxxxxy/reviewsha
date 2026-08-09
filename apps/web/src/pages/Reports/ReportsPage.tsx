import { Button, Card, EmptyState, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { reviewshaSdk } from '../../api/client';

export function ReportsPage() {
  const { id } = useParams();
  const reports = useQuery({
    enabled: Boolean(id),
    queryKey: ['reports', id],
    queryFn: () => reviewshaSdk.reports.list(id!),
  });
  if (!id)
    return (
      <section className="page">
        <EmptyState title="Choose a project" />
      </section>
    );
  if (reports.isLoading) return <Loader label="Loading reports" />;
  const download = async (reportId: string, format: 'md' | 'json' | 'pdf') => {
    const blob = await reviewshaSdk.reports.download(reportId, format);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="page">
      <h1>Reports</h1>
      {reports.data?.data.length ? (
        <div className="project-list">
          {reports.data.data.map((report) => (
            <Card key={report.id}>
              <h2>{report.summary || 'Analysis report'}</h2>
              <p>Score: {report.score ?? '—'}</p>
              <Button variant="secondary" onClick={() => void download(report.id, 'pdf')}>
                PDF
              </Button>{' '}
              <Button variant="secondary" onClick={() => void download(report.id, 'md')}>
                Markdown
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No reports yet" description="Upload a project and wait for analysis." />
      )}
    </section>
  );
}
