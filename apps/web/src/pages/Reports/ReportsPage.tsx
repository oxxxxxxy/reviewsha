import { Button, Card, EmptyState, Input, Loader } from '@reviewsha/ui';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { reviewshaSdk } from '../../api/client';
import { Markdown } from '../../components/Markdown';

export function ReportsPage() {
  const { id } = useParams();
  const location = useLocation();
  if (location.pathname.startsWith('/reports/')) return <ReportDetails reportId={id ?? ''} />;
  if (!id) return <ReportsProjectChooser />;
  return <ReportsList projectId={id} />;
}

function ReportsProjectChooser() {
  const projects = useQuery({
    queryKey: ['reports-projects'],
    queryFn: ({ signal }) =>
      reviewshaSdk.projects.list({ limit: 100, sort: 'updatedAt', order: 'desc' }, signal),
  });
  if (projects.isLoading) return <Loader label="Loading projects" />;
  if (projects.isError)
    return (
      <section className="page">
        <h1>Reports</h1>
        <p role="alert">Unable to load projects.</p>
        <Button onClick={() => void projects.refetch()}>Retry</Button>
      </section>
    );
  return (
    <section className="page">
      <h1>Reports</h1>
      {projects.data?.data.length ? (
        <div className="project-list">
          {projects.data.data.map((project) => (
            <Card key={project.id} role="link" tabIndex={0} onClick={() => (window.location.href = `/projects/${project.id}/reports`)}>
              <h2>{project.name}</h2>
              <Button onClick={(event) => { event.stopPropagation(); window.location.href = `/projects/${project.id}/reports`; }}>Open reports</Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No projects yet" />
      )}
    </section>
  );
}

function ReportsList({ projectId }: { projectId?: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [downloadError, setDownloadError] = useState<string>();
  const reports = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['reports', projectId],
    queryFn: ({ signal }) => reviewshaSdk.reports.list(projectId!, page, 20, signal),
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
    try {
      setDownloadError(undefined);
      const blob = await reviewshaSdk.reports.download(reportId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Unable to download this report. Please try again.');
    }
  };
  return (
    <section className="page">
      <h1>Reports</h1>
      <p>Select two reports to compare history.</p>
      {downloadError ? <p role="alert">{downloadError}</p> : null}
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
            <Card
              key={report.id}
              className="report-card"
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/reports/${report.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') navigate(`/reports/${report.id}`);
              }}
            >
              <label>
                <input
                  onClick={(event) => event.stopPropagation()}
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
              <h2>{(report.summary || 'Analysis report').slice(0, 180)}{(report.summary?.length ?? 0) > 180 ? '…' : ''}</h2>
              <Button
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/reports/${report.id}`);
                }}
              >
                View report
              </Button>
              <p>Score: {report.score ?? '—'}</p>
              <Button
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  void download(report.id, 'pdf');
                }}
              >
                PDF
              </Button>{' '}
              <Button
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  void download(report.id, 'md');
                }}
              >
                Markdown
              </Button>
              <Button
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  void download(report.id, 'json');
                }}
              >
                JSON
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No reports yet" description="Upload a project and wait for analysis." />
      )}
      {reports.data && reports.data.meta.totalPages > 1 ? (
        <nav aria-label="Report pages">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>{' '}
          <span>
            Page {page} of {reports.data.meta.totalPages}
          </span>{' '}
          <Button
            variant="secondary"
            disabled={page >= reports.data.meta.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </section>
  );
}

function ReportDetails({ reportId }: { reportId: string }) {
  const [findingSearch, setFindingSearch] = useState('');
  const [severity, setSeverity] = useState('ALL');
  const [openFile, setOpenFile] = useState<string>();
  const [downloadError, setDownloadError] = useState<string>();
  const report = useQuery({
    queryKey: ['report', reportId],
    queryFn: ({ signal }) => reviewshaSdk.reports.get(reportId, signal),
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
    try {
      setDownloadError(undefined);
      const blob = await reviewshaSdk.reports.download(reportId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Unable to download this report. Please try again.');
    }
  };
  const findings = item.issues.filter((issue) => {
    const matchesSeverity = severity === 'ALL' || issue.severity === severity;
    const haystack = `${issue.title} ${issue.description} ${issue.filePath}`.toLowerCase();
    return matchesSeverity && haystack.includes(findingSearch.toLowerCase());
  });
  const fileReviews = (item as unknown as ReportWithFiles).files ?? [];
  return (
    <section className="page">
      <h1>Reports</h1>
      <Card>
        <h2>Score: {item.score ?? '—'}</h2>
        <Markdown>{item.summary ?? 'No summary available.'}</Markdown>
        {downloadError ? <p role="alert">{downloadError}</p> : null}
        <Button onClick={() => void download('md')}>Markdown</Button>{' '}
        <Button onClick={() => void download('pdf')}>PDF</Button>{' '}
        <Button onClick={() => void download('json')}>JSON</Button>
      </Card>
      {fileReviews.length ? (
        <>
          <h2>File-by-file review</h2>
          <div className="file-review-grid">
            {fileReviews.map((file) => (
              <Card key={file.path}>
                <button
                  className="file-review-toggle"
                  type="button"
                  onClick={() => setOpenFile(openFile === file.path ? undefined : file.path)}
                >
                  <code>{file.path}</code>
                  <span className={file.issueCount ? 'file-issues' : 'file-ok'}>
                    {file.issueCount ? `${file.issueCount} issue(s)` : 'Reviewed · no findings'}
                  </span>
                </button>
                {openFile === file.path ? (
                  <div className="file-review-details">
                    <Markdown>{file.summary}</Markdown>
                    <p>
                      <strong>Strengths:</strong> {file.strengths.join(' · ') || '—'}
                    </p>
                    <p>
                      <strong>Risks:</strong> {file.weaknesses.join(' · ') || '—'}
                    </p>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </>
      ) : null}
      <h2>Findings</h2>
      <div className="form">
        <Input
          value={findingSearch}
          onChange={(event) => setFindingSearch(event.target.value)}
          placeholder="Search findings"
          aria-label="Search findings"
        />
        <label>
          Severity
          <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="ALL">All</option>
            {[...new Set(item.issues.map((issue) => issue.severity))].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      {findings.length ? (
        findings.map((issue) => (
          <Card key={issue.id}>
            <strong>
              {issue.severity}: {issue.title}
            </strong>
            <Markdown>{issue.description}</Markdown>
            <p>
              {issue.filePath}
              {issue.line ? `:${issue.line}` : ''}
            </p>
            <Markdown>{issue.recommendation ?? 'No recommendation.'}</Markdown>
          </Card>
        ))
      ) : (
        <EmptyState title={item.issues.length ? 'No matching findings' : 'No findings'} />
      )}
    </section>
  );
}

type ReportWithFiles = Omit<Awaited<ReturnType<typeof reviewshaSdk.reports.get>>, 'files'> & {
  files: Array<{
    path: string;
    issueCount: number;
    status: string;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  }>;
};
