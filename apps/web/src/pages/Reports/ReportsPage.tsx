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
                const uploadCount = project.stats?.uploadsCount ?? 0;
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
                        <strong>{uploadCount}</strong> uploads
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
                <div>
                  <button
                    className="reports-title-link"
                    type="button"
                    title={report.summary || 'Analysis report'}
                    onClick={() => navigate(`/reports/${report.id}`)}
                  >
                    {report.summary ? report.summary.slice(0, 64) : 'Analysis report'}
                    {(report.summary?.length ?? 0) > 64 ? '…' : ''}
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
  const downloadPatchedZip = async () => {
    try {
      const blob = await reviewshaSdk.reports.downloadPatchedZip(reportId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reviewsha-${reportId}-patched.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Unable to build the patched project archive.');
    }
  };
  const findings = item.issues.filter((issue) => {
    const matchesSeverity = severity === 'ALL' || issue.severity === severity;
    const haystack = `${issue.title} ${issue.description} ${issue.filePath}`.toLowerCase();
    return matchesSeverity && haystack.includes(findingSearch.toLowerCase());
  });
  const fileReviews = (item as unknown as ReportWithFiles).files ?? [];
  const selectedFile = fileReviews.find((file) => file.path === openFile) ?? fileReviews[0];
  const severityCounts = item.issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    return counts;
  }, {});
  return (
    <section className="page report-detail-page">
      <div className="page-heading report-detail-heading">
        <div>
          <button className="reports-back" type="button" onClick={() => window.history.back()}>
            ← Back to reports
          </button>
          <span className="eyebrow">Analysis report</span>
          <h1>Code review results</h1>
          <p className="muted">
            A structured view of the project score, file reviews and findings.
          </p>
        </div>
        <div className="report-score-hero">
          <span>Score</span>
          <strong>{item.score ?? '—'}</strong>
          <small>out of 100</small>
        </div>
      </div>
      <Card className="report-summary-card">
        <div className="report-summary-topline">
          <div>
            <span className="eyebrow">Executive summary</span>
            <h2>What matters most</h2>
          </div>
          <div className="report-downloads">
            <Button variant="secondary" onClick={() => void download('md')}>
              Markdown
            </Button>
            <Button variant="secondary" onClick={() => void download('pdf')}>
              PDF
            </Button>
            <Button variant="secondary" onClick={() => void download('json')}>
              JSON
            </Button>
            <Button variant="primary" onClick={() => void downloadPatchedZip()}>
              Download patched ZIP
            </Button>
          </div>
        </div>
        <div className="report-summary-text">
          <Markdown>{item.summary ?? 'No summary available.'}</Markdown>
        </div>
        <div className="report-severity-grid" aria-label="Finding summary">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((level) => (
            <div className={`report-severity ${level.toLowerCase()}`} key={level}>
              <strong>{severityCounts[level] ?? 0}</strong>
              <span>{level}</span>
            </div>
          ))}
        </div>
        {downloadError ? <p role="alert">{downloadError}</p> : null}
      </Card>
      {fileReviews.length ? (
        <section className="file-review-section" aria-labelledby="file-review-title">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Deep dive</span>
              <h2 id="file-review-title">Review by file</h2>
              <p className="muted">Select a file to read its review without losing your place.</p>
            </div>
            <span className="reports-count">{fileReviews.length} files</span>
          </div>
          <div className="file-review-explorer">
            <nav className="file-review-sidebar" aria-label="Reviewed files">
              {fileReviews.map((file) => (
                <button
                  className={`file-review-nav-item ${selectedFile?.path === file.path ? 'is-active' : ''}`}
                  type="button"
                  key={file.path}
                  onClick={() => setOpenFile(file.path)}
                >
                  <code>{file.path}</code>
                  <span className={file.issueCount ? 'file-issues' : 'file-ok'}>
                    {file.issueCount ? `${file.issueCount} findings` : 'No findings'}
                  </span>
                </button>
              ))}
            </nav>
            {selectedFile ? (
              <article className="file-review-content">
                <div className="file-review-content-heading">
                  <div>
                    <span className="eyebrow">Selected file</span>
                    <h3>{selectedFile.path}</h3>
                  </div>
                  <span className={selectedFile.issueCount ? 'file-issues' : 'file-ok'}>
                    {selectedFile.issueCount
                      ? `${selectedFile.issueCount} findings`
                      : 'Reviewed · no findings'}
                  </span>
                </div>
                <div className="file-review-summary">
                  <Markdown>{selectedFile.summary || 'No file summary available.'}</Markdown>
                </div>
                <div className="file-review-columns">
                  <div>
                    <h4>Strengths</h4>
                    {selectedFile.strengths.length ? (
                      <ul>
                        {selectedFile.strengths.map((value) => (
                          <li key={value}>{value}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No strengths noted.</p>
                    )}
                  </div>
                  <div>
                    <h4>Risks and improvements</h4>
                    {selectedFile.weaknesses.length ? (
                      <ul>
                        {selectedFile.weaknesses.map((value) => (
                          <li key={value}>{value}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No additional risks noted.</p>
                    )}
                  </div>
                </div>
                {getFileFindings(item.issues, selectedFile.path).length ? (
                  <div className="file-review-findings">
                    <h4>Findings in this file</h4>
                    <div className="file-review-finding-list">
                      {getFileFindings(item.issues, selectedFile.path).map((issue) => (
                        <div className="file-review-finding" key={issue.id}>
                          <div className="finding-item-header">
                            <span className={`finding-severity ${issue.severity.toLowerCase()}`}>
                              {issue.severity}
                            </span>
                            <code>
                              {issue.filePath}
                              {issue.line ? `:${issue.line}` : ''}
                            </code>
                          </div>
                          <h5>{issue.title}</h5>
                          <FindingCodeContext issue={issue as unknown as ReportIssueForContext} />
                          <div className="finding-recommendation">
                            <strong>Recommended fix</strong>
                            <Markdown>{issue.recommendation ?? 'No recommendation.'}</Markdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ) : null}
          </div>
        </section>
      ) : null}
      <section className="findings-section" aria-labelledby="findings-title">
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">Action items</span>
            <h2 id="findings-title">Findings</h2>
            <p className="muted">Prioritized issues with a location and recommended fix.</p>
          </div>
          <span className="reports-count">{findings.length} shown</span>
        </div>
        <div className="findings-toolbar">
          <Input
            value={findingSearch}
            onChange={(event) => setFindingSearch(event.target.value)}
            placeholder="Search title, description or file path"
            aria-label="Search findings"
          />
          <label>
            Severity
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option value="ALL">All severities</option>
              {[...new Set(item.issues.map((issue) => issue.severity))].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        {findings.length ? (
          <div className="finding-list">
            {findings.map((issue) => (
              <article className="finding-item" key={issue.id}>
                <div className="finding-item-header">
                  <span className={`finding-severity ${issue.severity.toLowerCase()}`}>
                    {issue.severity}
                  </span>
                  <code>
                    {issue.filePath}
                    {issue.line ? `:${issue.line}` : ''}
                  </code>
                </div>
                <h3>{issue.title}</h3>
                <FindingCodeContext issue={issue as unknown as ReportIssueForContext} />
                <div className="finding-recommendation">
                  <strong>Recommended fix</strong>
                  <Markdown>{issue.recommendation ?? 'No recommendation.'}</Markdown>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title={item.issues.length ? 'No matching findings' : 'No findings'} />
        )}
      </section>
    </section>
  );
}

type CodeContext = {
  startLine: number;
  endLine: number;
  lines: Array<{
    line: number;
    content: string;
    isTarget: boolean;
    kind?: 'context' | 'removed' | 'added';
  }>;
};

type SuggestedPatch = { before: string; after: string; startLine?: number; endLine?: number };

type ReportIssueForContext = {
  line?: number | null;
  codeContext?: CodeContext | null;
  suggestedPatch?: SuggestedPatch | null;
};

export function pathsMatch(left: string, right: string): boolean {
  const normalize = (value: string) =>
    value
      .replaceAll('\\', '/')
      .replace(/^\/+/, '')
      .replace(/^project:\/\/?/, '')
      .toLowerCase();
  const a = normalize(left);
  const b = normalize(right);
  return a === b || a.endsWith(`/${b}`) || b.endsWith(`/${a}`);
}

export function getFileFindings<T extends { filePath: string }>(
  issues: T[],
  filePath: string,
): T[] {
  return issues.filter((issue) => pathsMatch(issue.filePath, filePath));
}

export function buildFindingCodeContext(issue: ReportIssueForContext): CodeContext | null {
  const context = issue.codeContext ?? null;
  const patch = issue.suggestedPatch ?? null;
  if (!context && !patch) return null;
  if (!patch) return context;

  const targetLine = issue.line ?? patch.startLine ?? patch.endLine ?? context?.startLine ?? 1;
  const targetIndex =
    context?.lines.findIndex((line) => line.isTarget || line.line === targetLine) ?? -1;
  const before = patch.before
    ? [{ line: targetLine, content: patch.before, kind: 'removed' as const }]
    : [];
  const after = patch.after
    ? [{ line: targetLine, content: patch.after, kind: 'added' as const }]
    : [];

  if (context && targetIndex >= 0) {
    const lines = [
      ...context.lines.slice(0, targetIndex).map((line) => ({ ...line, kind: 'context' as const })),
      ...before,
      ...after,
      ...context.lines
        .slice(targetIndex + 1)
        .map((line) => ({ ...line, kind: 'context' as const })),
    ];
    return {
      startLine: Math.min(...lines.map((line) => line.line)),
      endLine: Math.max(...lines.map((line) => line.line)),
      lines: lines.map((line) => ({
        line: line.line,
        content: line.content,
        isTarget: line.kind !== 'context',
        kind: line.kind,
      })),
    };
  }

  const lines = [...before, ...after];
  return {
    startLine: targetLine,
    endLine: targetLine,
    lines: lines.map((line) => ({
      line: line.line,
      content: line.content,
      isTarget: true,
      kind: line.kind,
    })),
  };
}

function FindingCodeContext({ issue }: { issue: ReportIssueForContext }) {
  const context = buildFindingCodeContext(issue);
  return context ? <CodeContextBlock context={context} /> : null;
}

function CodeContextBlock({ context }: { context: CodeContext }) {
  return (
    <div className="finding-code-context" aria-label="Code context">
      <div className="finding-code-context-header">
        <span>Code context</span>
        <span>
          Lines {context.startLine}–{context.endLine}
        </span>
      </div>
      <pre>
        {context.lines.map((line) => (
          <code
            className={line.kind ? `is-${line.kind}` : line.isTarget ? 'is-target' : ''}
            key={`${line.line}-${line.kind ?? 'context'}-${line.content}`}
          >
            <span className="finding-code-line-number">{line.line}</span>
            <span className="finding-code-line-content">{line.content || ' '}</span>
          </code>
        ))}
      </pre>
    </div>
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
