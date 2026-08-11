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
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
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
  const projectItems = projects.data?.data ?? [];
  const filteredProjects = projectItems.filter((project) => {
    const term = search.trim().toLowerCase();
    return !term || `${project.name} ${project.description ?? ''}`.toLowerCase().includes(term);
  });

  return (
    <section className="page reports-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Workspace insights</span>
          <h1>Reports</h1>
          <p className="muted">Choose a project to view its analysis history and reports.</p>
        </div>
        <span className="reports-count">{projectItems.length} projects</span>
      </div>
      {projectItems.length ? (
        <>
          <div className="reports-toolbar">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects"
              aria-label="Search projects for reports"
            />
            <span className="muted">
              {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
          {filteredProjects.length ? (
            <div className="reports-project-list">
              {filteredProjects.map((project) => {
                const reportCount = project.stats?.reportsCount ?? 0;
                const analysisCount = project.stats?.analysesCount ?? 0;
                return (
                  <Card
                    key={project.id}
                    className="reports-project-row"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/projects/${project.id}/reports`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/projects/${project.id}/reports`);
                      }
                    }}
                  >
                    <div className="reports-project-main">
                      <div className="reports-project-icon" aria-hidden="true">
                        {project.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h2>{project.name}</h2>
                        <p className="muted">{project.description || 'No description'}</p>
                      </div>
                    </div>
                    <div
                      className="reports-project-stats"
                      aria-label={`${project.name} report summary`}
                    >
                      <span>
                        <strong>{reportCount}</strong> reports
                      </span>
                      <span>
                        <strong>{analysisCount}</strong> analyses
                      </span>
                      <span>
                        {project.stats?.lastAnalysisAt
                          ? `Updated ${formatDate(project.stats.lastAnalysisAt)}`
                          : 'No analyses yet'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/projects/${project.id}/reports`);
                      }}
                    >
                      View reports <span aria-hidden="true">→</span>
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No matching projects" description="Try another project name." />
          )}
        </>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create a project to start collecting reports."
        />
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function ReportsList({ projectId }: { projectId?: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [downloadError, setDownloadError] = useState<string>();
  const reports = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['reports', projectId, page],
    queryFn: ({ signal }) => reviewshaSdk.reports.list(projectId!, page, 20, signal),
  });
  const project = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['project', projectId],
    queryFn: ({ signal }) => reviewshaSdk.projects.get(projectId!, signal),
  });
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
  const toggleReport = (reportId: string) =>
    setSelected((current) =>
      current.includes(reportId)
        ? current.filter((id) => id !== reportId)
        : current.length < 2
          ? [...current, reportId]
          : current,
    );
  return (
    <section className="page reports-page">
      <div className="page-heading reports-list-heading">
        <div>
          <button className="reports-back" type="button" onClick={() => navigate('/reports')}>
            ← All projects
          </button>
          <span className="eyebrow">Project history</span>
          <h1>{project.data?.data.name ?? 'Reports'}</h1>
          <p className="muted">Analysis reports and score history for this project.</p>
        </div>
        <span className="reports-count">{reports.data?.meta.total ?? 0} reports</span>
      </div>
      {downloadError ? <p role="alert">{downloadError}</p> : null}
      <div className="reports-compare-toolbar">
        <div>
          <strong>Compare reports</strong>
          <span className="muted"> Select two reports to see what changed.</span>
        </div>
        <Button
          disabled={selected.length !== 2}
          isLoading={compare.isFetching}
          onClick={() => void compare.refetch()}
        >
          Compare selected ({selected.length}/2)
        </Button>
      </div>
      {compare.data ? (
        <Card className="reports-compare-result">
          <div>
            <span className="eyebrow">Comparison</span>
            <h2>Report changes</h2>
          </div>
          <div className="reports-compare-metrics">
            <span>
              <strong>
                {compare.data.scoreDiff > 0 ? '+' : ''}
                {compare.data.scoreDiff}
              </strong>{' '}
              score difference
            </span>
            <span>
              <strong>{compare.data.newIssues}</strong> new issues
            </span>
            <span>
              <strong>{compare.data.resolvedIssues}</strong> resolved issues
            </span>
          </div>
        </Card>
      ) : null}
      {reports.data?.data.length ? (
        <div className="reports-history" aria-label="Project reports">
          <div className="reports-history-header" aria-hidden="true">
            <span>Report</span>
            <span>Score</span>
            <span>Status</span>
            <span>Created</span>
            <span>Actions</span>
          </div>
          {reports.data.data.map((report, index) => (
            <article className="reports-history-row" key={report.id}>
              <div className="reports-history-name">
                <label className="reports-select">
                  <input
                    type="checkbox"
                    checked={selected.includes(report.id)}
                    onChange={() => toggleReport(report.id)}
                    aria-label={`Select report ${index + 1} for comparison`}
                  />
                </label>
                <div>
                  <button
                    className="reports-title-link"
                    type="button"
                    onClick={() => navigate(`/reports/${report.id}`)}
                  >
                    {report.summary ? report.summary.slice(0, 105) : 'Analysis report'}
                    {(report.summary?.length ?? 0) > 105 ? '…' : ''}
                  </button>
                  <small className="muted">
                    Report {reports.data!.meta.total - index - (page - 1) * 20}
                  </small>
                </div>
              </div>
              <strong
                className={`report-score ${(report.score ?? 0) >= 80 ? 'is-good' : (report.score ?? 0) >= 60 ? 'is-medium' : 'is-low'}`}
              >
                {report.score ?? '—'}
              </strong>
              <span className="report-status">{report.status ?? 'COMPLETED'}</span>
              <span className="muted">{formatDate(report.createdAt)}</span>
              <div className="reports-row-actions">
                <Button variant="secondary" onClick={() => navigate(`/reports/${report.id}`)}>
                  View
                </Button>
                <Button variant="ghost" onClick={() => void download(report.id, 'pdf')}>
                  PDF
                </Button>
                <Button variant="ghost" onClick={() => void download(report.id, 'md')}>
                  MD
                </Button>
                <Button variant="ghost" onClick={() => void download(report.id, 'json')}>
                  JSON
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No reports yet" description="Upload a project and wait for analysis." />
      )}
      {reports.data && reports.data.meta.totalPages > 1 ? (
        <nav className="reports-pagination" aria-label="Report pages">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} of {reports.data.meta.totalPages}
          </span>
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
