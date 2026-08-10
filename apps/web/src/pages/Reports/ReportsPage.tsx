import { Button, Card, EmptyState, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useParams } from 'react-router-dom';
import { useState } from 'react';
import { reviewshaSdk } from '../../api/client';

export function ReportsPage() {
  const { id } = useParams();
  const location = useLocation();
  if (location.pathname.startsWith('/reports/')) return <ReportDetails reportId={id ?? ''} />;
  return <ReportsList projectId={id} />;
}

function ReportsList({ projectId }: { projectId?: string }) {
  const reports = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['reports', projectId],
    queryFn: () => reviewshaSdk.reports.list(projectId!),
  });
  const [selected, setSelected] = useState<string[]>([]);
  const compare = useQuery({
    enabled: selected.length === 2,
    queryKey: ['report-compare', ...selected],
    queryFn: () => reviewshaSdk.reports.compare(selected[0]!, selected[1]!),
  });
  if (!projectId)
    return (
      <section className="page">
        <EmptyState title="Choose a project" />
      </section>
    );
  if (reports.isLoading) return <Loader label="Loading reports" />;
  if (reports.isError)
    return (
      <section className="page">
        <h1>Reports</h1>
        <p role="alert">Unable to load reports.</p>
        <Button onClick={() => void reports.refetch()}>Retry</Button>
      </section>
    );
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
      <p>Select two reports to compare history.</p>
      {selected.length === 2 ? (
        <Button onClick={() => void compare.refetch()} isLoading={compare.isFetching}>
          Compare selected
        </Button>
      ) : null}
      {compare.data ? (
        <Card>
          <strong>Score difference: {compare.data.scoreDiff}</strong>
          <p>New issues: {compare.data.newIssues}</p>
          <p>Resolved issues: {compare.data.resolvedIssues}</p>
        </Card>
      ) : null}
      {reports.data?.data.length ? (
        <div className="project-list">
          {reports.data.data.map((report) => (
            <Card key={report.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(report.id)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(report.id)
                        ? current.filter((id) => id !== report.id)
                        : current.length < 2
                          ? [...current, report.id]
                          : current,
                    )
                  }
                />{' '}
                Compare
              </label>
              <h2>{report.summary || 'Analysis report'}</h2>
              <p>Score: {report.score ?? '—'}</p>
              <Button variant="secondary" onClick={() => void download(report.id, 'pdf')}>
                PDF
              </Button>{' '}
              <Button variant="secondary" onClick={() => void download(report.id, 'md')}>
                Markdown
              </Button>
              <Button variant="secondary" onClick={() => void download(report.id, 'json')}>
                JSON
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

function ReportDetails({ reportId }: { reportId: string }) {
  const report = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reviewshaSdk.reports.get(reportId),
  });
  if (report.isLoading)
    return (
      <section className="page">
        <h1>Reports</h1>
        <Loader label="Loading report" />
      </section>
    );
  if (report.isError || !report.data)
    return (
      <section className="page">
        <h1>Reports</h1>
        <p role="alert">Unable to load report.</p>
        <Button onClick={() => void report.refetch()}>Retry</Button>
      </section>
    );
  const item = report.data;
  const download = async (format: 'md' | 'json' | 'pdf') => {
    const blob = await reviewshaSdk.reports.download(reportId, format);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${reportId}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="page">
      <h1>Reports</h1>
      <Card>
        <h2>Score: {item.score ?? '—'}</h2>
        <p>{item.summary ?? 'No summary available.'}</p>
        <Button onClick={() => void download('md')}>Markdown</Button>{' '}
        <Button onClick={() => void download('pdf')}>PDF</Button>{' '}
        <Button onClick={() => void download('json')}>JSON</Button>
      </Card>
      <h2>Findings</h2>
      {item.issues.length ? (
        item.issues.map((issue) => (
          <Card key={issue.id}>
            <strong>
              {issue.severity}: {issue.title}
            </strong>
            <p>{issue.description}</p>
            <p>
              {issue.filePath}
              {issue.line ? `:${issue.line}` : ''}
            </p>
            <p>{issue.recommendation ?? 'No recommendation.'}</p>
          </Card>
        ))
      ) : (
        <EmptyState title="No findings" />
      )}
    </section>
  );
}
