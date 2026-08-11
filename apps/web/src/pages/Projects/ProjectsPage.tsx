import { Badge, Button, Card, EmptyState, Input, Loader, Modal, Textarea } from '@reviewsha/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { reviewshaSdk } from '../../api/client';

export function ProjectsPage() {
  const { id } = useParams();
  return id ? <ProjectDetails projectId={id} /> : <ProjectsList />;
}

function ProjectsList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'updatedAt' | 'name'>('updatedAt');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [deleteProject, setDeleteProject] = useState<{ id: string; name: string }>();
  const client = useQueryClient();
  const navigate = useNavigate();
  const projects = useQuery({
    queryKey: ['projects', search, page, sort],
    queryFn: ({ signal }) =>
      reviewshaSdk.projects.list({ search, page, limit: 20, sort, order: 'desc' }, signal),
  });
  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const create = useMutation({
    mutationFn: () =>
      reviewshaSdk.projects.create({
        name,
        description: description || undefined,
        tags,
        githubUrl: githubUrl.trim() || undefined,
        githubBranch: githubUrl.trim() ? githubBranch.trim() || undefined : undefined,
      }),
    onSuccess: ({ data }) => {
      void client.invalidateQueries({ queryKey: ['projects'] });
      if (githubUrl.trim()) {
        void reviewshaSdk.uploads
          .importGithub(data.id, githubUrl.trim(), githubBranch.trim() || undefined)
          .finally(() => navigate(`/projects/${data.id}`));
      } else navigate(`/projects/${data.id}`);
    },
  });
  const remove = useMutation({
    mutationFn: (projectId: string) => reviewshaSdk.projects.remove(projectId),
    onSuccess: () => {
      setDeleteProject(undefined);
      void client.invalidateQueries({ queryKey: ['projects'] });
    },
  });
  if (projects.isLoading) return <Loader label="Loading projects" />;
  if (projects.isError)
    return (
      <section className="page">
        <h1>Projects</h1>
        <p role="alert">Unable to load projects.</p>
        <Button onClick={() => void projects.refetch()}>Retry</Button>
      </section>
    );
  return (
    <section className="page projects-page">
      <header className="projects-list-header">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Projects</h1>
          <p className="projects-list-subtitle">
            Keep your codebases, uploads, analyses, and reports in one place.
          </p>
        </div>
        <div className="projects-total" aria-label={`${projects.data?.meta.total ?? 0} projects`}>
          <strong>{projects.data?.meta.total ?? 0}</strong>
          <span>projects</span>
        </div>
      </header>
      <div className="projects-workspace">
        <div className="project-search-panel">
          <div className="project-panel-heading">
            <div>
              <span className="eyebrow">Your workspace</span>
              <h2>Find a project</h2>
            </div>
            <span className="project-panel-icon" aria-hidden="true">
              ⌕
            </span>
          </div>
          <Input
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search by project name"
            aria-label="Search projects"
          />
          <label className="project-sort-control">
            <span>Sort projects</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                setPage(1);
              }}
            >
              <option value="updatedAt">Recently updated</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
          <p className="project-panel-hint">Use search to quickly find a codebase.</p>
        </div>
        <form
          className="project-create-panel form"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <div className="project-panel-heading">
            <div>
              <span className="eyebrow">Start a review</span>
              <h2>Create project</h2>
            </div>
            <span className="project-panel-icon" aria-hidden="true">
              ＋
            </span>
          </div>
          <p className="project-panel-hint">
            Add a repository now, or connect GitHub after creation.
          </p>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            aria-label="New project name"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
          />
          <TechnologyTagsField tags={tags} onChange={setTags} />
          <Input
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            placeholder="GitHub repository (optional)"
          />
          <Input
            value={githubBranch}
            onChange={(event) => setGithubBranch(event.target.value)}
            placeholder="GitHub branch (optional)"
          />
          <Button type="submit" disabled={!name.trim()} isLoading={create.isPending}>
            Create project
          </Button>
          {create.isError ? <p role="alert">Unable to create project.</p> : null}
        </form>
      </div>
      {projects.data?.data.length ? (
        <div className="project-list project-cards">
          {projects.data.data.map((project) => (
            <Card key={project.id} className="project-card">
              <div className="project-card-topline">
                <span className="project-updated">
                  Updated {formatProjectDate(project.updatedAt)}
                </span>
              </div>
              <div className="project-card-title-row">
                <div>
                  <h2 title={project.name}>{project.name}</h2>
                  <p>{project.description || 'No description yet'}</p>
                </div>
              </div>
              {projectTechnologyTags(project.language, project.tags).length ? (
                <div className="project-card-tags" aria-label="Project tags">
                  {projectTechnologyTags(project.language, project.tags)
                    .slice(0, 4)
                    .map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  {projectTechnologyTags(project.language, project.tags).length > 4 ? (
                    <span>+{projectTechnologyTags(project.language, project.tags).length - 4}</span>
                  ) : null}
                </div>
              ) : null}
              <div className="project-card-stats" aria-label="Project activity">
                <span>
                  <strong>{project.stats?.reportsCount ?? 0}</strong> reports
                </span>
                <span>
                  <strong>{project.stats?.uploadsCount ?? 0}</strong> uploads
                </span>
              </div>
              <div className="project-card-actions">
                <Button type="button" onClick={() => navigate(`/projects/${project.id}`)}>
                  Open project
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteProject({ id: project.id, name: project.name })}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No projects yet" description="Create your first project." />
      )}
      {projects.data && projects.data.meta.pages > 1 ? (
        <nav aria-label="Project pages">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>{' '}
          <span>
            Page {page} of {projects.data.meta.pages}
          </span>{' '}
          <Button
            variant="secondary"
            disabled={page >= projects.data.meta.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
      <Modal
        isOpen={Boolean(deleteProject)}
        title="Delete this project?"
        onClose={() => setDeleteProject(undefined)}
      >
        <p>
          This removes the project from your active workspace. This action cannot be undone from the
          web app.
        </p>
        <Button variant="secondary" onClick={() => setDeleteProject(undefined)}>
          Cancel
        </Button>{' '}
        <Button
          isLoading={remove.isPending}
          onClick={() => {
            if (!deleteProject) return;
            remove.mutate(deleteProject.id);
          }}
        >
          Delete project
        </Button>
        {remove.isError ? <p role="alert">Unable to delete project.</p> : null}
      </Modal>
    </section>
  );
}

function formatProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

const popularLanguageSuggestions = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C#',
  'C++',
  'C',
  'Go',
  'Rust',
  'PHP',
  'Ruby',
  'Kotlin',
  'Swift',
  'Dart',
  'SQL',
  'R',
  'Scala',
  'Lua',
  'Perl',
  'Objective-C',
  'Haskell',
  'Elixir',
  'Erlang',
  'Julia',
  'Assembly',
];

const technologySuggestions = [
  ...popularLanguageSuggestions,
  'React',
  'React Native',
  'Vue.js',
  'Angular',
  'Svelte',
  'SolidJS',
  'Next.js',
  'Nuxt',
  'Node.js',
  'Bun',
  'Deno',
  'Express',
  'NestJS',
  'Fastify',
  'Django',
  'Flask',
  'FastAPI',
  'Spring Boot',
  'Laravel',
  'Ruby on Rails',
  'ASP.NET',
  'Flutter',
  'Tailwind CSS',
  'HTML',
  'CSS',
  'SCSS',
  'Sass',
  'JSON',
  'XML',
  'YAML',
  'GraphQL',
  'REST API',
  'WebSocket',
  'gRPC',
  'WebAssembly',
  'PostgreSQL',
  'MySQL',
  'MariaDB',
  'SQLite',
  'MongoDB',
  'Redis',
  'Elasticsearch',
  'DynamoDB',
  'Firebase',
  'Supabase',
  'Prisma',
  'Drizzle',
  'TypeORM',
  'Sequelize',
  'Git',
  'GitHub',
  'GitLab',
  'Docker',
  'Kubernetes',
  'Helm',
  'Terraform',
  'Ansible',
  'Nginx',
  'Linux',
  'AWS',
  'Azure',
  'Google Cloud',
  'Vercel',
  'Cloudflare',
  'GitHub Actions',
  'Jenkins',
  'Prometheus',
  'Grafana',
  'RabbitMQ',
  'Kafka',
  'BullMQ',
  'Jest',
  'Vitest',
  'Cypress',
  'Playwright',
  'Selenium',
  'Storybook',
  'Webpack',
  'Vite',
  'Babel',
  'ESLint',
  'Prettier',
  'OpenAPI',
  'Swagger',
  'OAuth',
  'JWT',
  'Web3',
  'Solidity',
];

function projectTechnologyTags(language: string | null | undefined, tags: string[] | undefined) {
  return [
    ...new Set([language, ...(tags ?? [])].filter((value): value is string => Boolean(value))),
  ];
}

function TechnologyTagsField({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const addTag = (value: string) => {
    const tag = value.trim().replace(/,$/, '');
    if (!tag || tags.some((item) => item.toLowerCase() === tag.toLowerCase())) return;
    onChange([...tags, tag]);
    setDraft('');
  };
  const suggestionSource = draft ? technologySuggestions : popularLanguageSuggestions;
  const suggestions = suggestionSource.filter(
    (suggestion) =>
      !tags.some((tag) => tag.toLowerCase() === suggestion.toLowerCase()) &&
      (!draft || suggestion.toLowerCase().includes(draft.toLowerCase())),
  );
  return (
    <div className="technology-tags-field">
      <label htmlFor="project-technologies">Stack and technologies</label>
      <div className="technology-tags-input" onClick={() => setFocused(true)}>
        <div className="technology-tags-chips">
          {tags.map((tag) => (
            <span className="technology-tag-chip" key={tag}>
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(tags.filter((item) => item !== tag))}
              >
                ×
              </button>
            </span>
          ))}
          <input
            id="project-technologies"
            value={draft}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addTag(draft);
              } else if (event.key === 'Backspace' && !draft && tags.length) {
                onChange(tags.slice(0, -1));
              }
            }}
            placeholder={tags.length ? 'Add technology…' : 'Type a technology, e.g. React'}
            aria-label="Project technologies and tags"
          />
        </div>
        {focused && suggestions.length ? (
          <div
            className="technology-suggestions"
            role="listbox"
            aria-label="Technology suggestions"
          >
            <span className="technology-suggestions-label">Popular</span>
            <div>
              {suggestions.slice(0, 8).map((suggestion) => (
                <button type="button" key={suggestion} onMouseDown={() => addTag(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <small>Press Enter to add a technology. These tags describe the project stack.</small>
    </div>
  );
}

function ProjectDetails({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: ({ signal }) => reviewshaSdk.projects.get(projectId, signal),
  });
  const removeProject = useMutation({
    mutationFn: () => reviewshaSdk.projects.remove(projectId),
    onSuccess: () => window.location.assign('/projects'),
  });
  const [uploadProgress, setUploadProgress] = useState<number>();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string>();
  const [lastUpload, setLastUpload] = useState<File>();
  const [selectedUploadId, setSelectedUploadId] = useState<string>();
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deleteVersionId, setDeleteVersionId] = useState<string>();
  const uploads = useQuery({
    queryKey: ['uploads', projectId],
    queryFn: ({ signal }) => reviewshaSdk.uploads.list(projectId, signal),
  });
  const githubSync = useQuery({
    enabled: Boolean(project.data?.data.githubUrl),
    queryKey: [
      'github-sync',
      projectId,
      project.data?.data.githubUrl,
      project.data?.data.githubBranch,
    ],
    queryFn: () =>
      reviewshaSdk.uploads.importGithub(
        projectId,
        project.data!.data.githubUrl!,
        project.data!.data.githubBranch || undefined,
      ),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (githubSync.data) void client.invalidateQueries({ queryKey: ['uploads', projectId] });
  }, [client, githubSync.data, projectId]);
  const upload = useMutation({
    mutationFn: (file: File) => {
      uploadController.current = new AbortController();
      return reviewshaSdk.uploads.upload(
        projectId,
        file,
        setUploadProgress,
        uploadController.current.signal,
      );
    },
    onSuccess: () => {
      setUploadProgress(100);
      uploadController.current = undefined;
      void client.invalidateQueries({ queryKey: ['uploads', projectId] });
      void client.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      uploadController.current = undefined;
      if ((error as Error).name !== 'CanceledError') {
        const message = error instanceof Error ? error.message : '';
        setUploadError(message || 'Upload failed. Check the file format and try again.');
      }
    },
  });
  const removeUpload = useMutation({
    mutationFn: (uploadId: string) => reviewshaSdk.uploads.remove(projectId, uploadId),
    onSuccess: () => uploads.refetch(),
  });
  const analyses = useQuery({
    queryKey: ['analyses', projectId],
    queryFn: ({ signal }) => reviewshaSdk.analyses.list(projectId, 1, 20, signal),
    refetchInterval: (query) => {
      const status = query.state.data?.data[0]?.pipelineStatus;
      return status === 'RUNNING' || status === 'PENDING' ? 3000 : false;
    },
  });
  const analyze = useMutation({
    mutationFn: () =>
      reviewshaSdk.analyses.start(
        projectId,
        selectedUploadId,
        localStorage.getItem('reviewsha.language') === 'en' ? 'en' : 'ru',
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['analyses', projectId] });
      void client.invalidateQueries({ queryKey: ['projects'] });
    },
  });
  const cancel = useMutation({
    mutationFn: () => {
      const active = analyses.data?.data.find(
        (entry) => entry.pipelineStatus === 'RUNNING' || entry.pipelineStatus === 'PENDING',
      );
      if (!active) throw new Error('No active analysis');
      return reviewshaSdk.pipelines.cancel(active.id);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['analyses', projectId] }),
  });
  if (project.isLoading) return <Loader label="Loading project" />;
  if (project.isError || !project.data)
    return (
      <section className="page">
        <p role="alert">Project not found.</p>
      </section>
    );
  const item = project.data.data;
  const isGithubProject = Boolean(item.githubUrl);
  const projectTags = projectTechnologyTags(item.language, item.tags);
  const uploadFile = (file: File) => {
    setUploadError(undefined);
    if (isGithubProject) {
      setUploadError(
        'Manual uploads are disabled for GitHub-connected projects. Sync a commit instead.',
      );
      return;
    }
    const supported =
      /\.(zip|rar|7z|tar|gz|tgz|js|jsx|ts|tsx|mjs|cjs|json|jsonc|py|rb|php|java|kt|go|rs|c|h|cpp|hpp|cs|swift|dart|sh|sql|vue|svelte|html|css|scss|less|xml|toml|ini|ya?ml|md|mdx|txt|rst|csv|log|pdf|docx?|odt|rtf|xlsx?|ods|pptx?|odp)$/i.test(
        file.name,
      );
    if (!supported) {
      setUploadError(
        'Unsupported file type. Upload a supported archive, source file, document, or PDF.',
      );
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('The file is too large. Maximum size: 100 MB.');
      return;
    }
    setLastUpload(file);
    upload.mutate(file);
  };
  return (
    <section className="page project-details-page">
      <Link className="project-breadcrumb" to="/projects">
        ← All projects
      </Link>
      <header className="project-hero">
        <div className="project-hero-main">
          <span className="eyebrow">Project workspace</span>
          <h1>{item.name}</h1>
          <p className="project-hero-description">{item.description || 'No description yet'}</p>
          <div className="project-hero-meta">
            {projectTags.length ? (
              <span>{projectTags.map((tag) => `#${tag}`).join(' ')}</span>
            ) : null}
          </div>
        </div>
        <div className="project-hero-actions" role="group" aria-label="Project actions">
          <Link className="project-action-link" to={`/projects/${projectId}/settings`}>
            Project settings
          </Link>
          <Button
            className="project-delete-action"
            variant="ghost"
            isLoading={removeProject.isPending}
            onClick={() => setDeleteProjectOpen(true)}
          >
            Delete project
          </Button>
          <Button
            className="project-primary-action"
            disabled={analyze.isPending}
            isLoading={analyze.isPending}
            onClick={() => analyze.mutate()}
          >
            Start analysis
          </Button>
          <Link className="project-action-link" to={`/projects/${projectId}/reports`}>
            Open reports
          </Link>
          <Link className="project-action-link" to={`/projects/${projectId}/chat`}>
            Open chat
          </Link>
        </div>
      </header>
      <div className="project-details-summary">
        <span>
          <strong>{item.stats?.reportsCount ?? 0}</strong> reports
        </span>
        <span>
          <strong>{item.stats?.uploadsCount ?? 0}</strong> uploads
        </span>
        {item.githubUrl ? (
          <span className="project-source-summary">GitHub · {item.githubBranch || 'HEAD'}</span>
        ) : null}
      </div>
      <Modal
        isOpen={deleteProjectOpen}
        title="Delete this project?"
        onClose={() => setDeleteProjectOpen(false)}
      >
        <p>This removes the project from the active workspace.</p>
        <Button variant="secondary" onClick={() => setDeleteProjectOpen(false)}>
          Cancel
        </Button>{' '}
        <Button
          isLoading={removeProject.isPending}
          onClick={() => {
            removeProject.mutate();
            setDeleteProjectOpen(false);
          }}
        >
          Delete project
        </Button>
      </Modal>
      <section className="analysis-section" aria-label="Analysis">
        <h2>Analysis</h2>
        {analyses.data?.data[0] ? (
          <Card className="analysis-card">
            {(() => {
              const current = analyses.data.data[0] as (typeof analyses.data.data)[0] & {
                reviewTotal?: number;
                reviewCompleted?: number;
                reviewFailed?: number;
              };
              const total = current.reviewTotal ?? 0;
              const completed = current.reviewCompleted ?? 0;
              const failed = current.reviewFailed ?? 0;
              return (
                <>
                  <div className="analysis-header">
                    <Badge
                      tone={
                        current.status === 'COMPLETED' ? 'success' : failed ? 'danger' : 'warning'
                      }
                    >
                      {current.status}
                    </Badge>
                    <strong className="analysis-progress-value">{current.progress}%</strong>
                  </div>
                  <div className="analysis-progress-track">
                    <span style={{ width: `${current.progress}%` }} />
                  </div>
                  <p className="analysis-progress-label">
                    {current.currentStep ?? 'Queued'}
                    {total
                      ? current.progress === 100 && completed < total
                        ? ` · pipeline finished, ${completed}/${total} AI reviews returned`
                        : ` · ${completed}/${total} AI reviews complete`
                      : ''}
                    {failed ? ` · ${failed} failed` : ''}
                  </p>
                  <div className="analysis-steps" aria-label="Analysis progress">
                    {['DOWNLOAD', 'EXTRACT', 'PARSE', 'ANALYZE', 'REPORT'].map((step) => (
                      <span
                        key={step}
                        className={
                          current.currentStep === step
                            ? 'active'
                            : ['DOWNLOAD', 'EXTRACT', 'PARSE', 'ANALYZE'].indexOf(step) <
                                ['DOWNLOAD', 'EXTRACT', 'PARSE', 'ANALYZE'].indexOf(
                                  current.currentStep ?? '',
                                )
                              ? 'done'
                              : ''
                        }
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                </>
              );
            })()}
            {analyses.data.data[0].status === 'FAILED' ? (
              <p className="analysis-error" role="alert">
                {analyses.data.data[0].errorMessage ?? 'Analysis failed.'}
              </p>
            ) : null}
          </Card>
        ) : (
          <EmptyState title="Analysis hasn't started" />
        )}
        {analyses.data?.data[0] &&
        !['COMPLETED', 'FAILED', 'CANCELLED'].includes(analyses.data.data[0].status ?? '') ? (
          <Button variant="secondary" isLoading={cancel.isPending} onClick={() => cancel.mutate()}>
            Cancel analysis
          </Button>
        ) : null}
        {analyze.isError ? <p role="alert">Unable to start analysis.</p> : null}
      </section>
      {isGithubProject ? (
        <section className="upload-panel github-source-panel" aria-label="GitHub source">
          <div>
            <span className="eyebrow">Connected source</span>
            <h2>GitHub commit history</h2>
            <p>
              Manual uploads are disabled. Each version below is an immutable commit from{' '}
              <a href={item.githubUrl!} target="_blank" rel="noreferrer">
                {item.githubUrl}
              </a>{' '}
              on <strong>{item.githubBranch || 'HEAD'}</strong>.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            isLoading={githubSync.isFetching}
            onClick={() => void githubSync.refetch()}
          >
            Sync latest commits
          </Button>
          {githubSync.isError ? (
            <p role="alert">Unable to sync GitHub commits. Check the repository and branch.</p>
          ) : null}
          <small>New commits are checked automatically while this project is open.</small>
        </section>
      ) : (
        <section className="upload-panel">
          <h2>Upload project or file</h2>
          <div
            className="upload-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) uploadFile(file);
            }}
            role="region"
            aria-label="Project file upload drop zone"
          >
            <div className="upload-dropzone-copy">
              <strong>Drag and drop a file here</strong>
              <span>ZIP, source files, documents, or PDF up to 100 MB</span>
            </div>
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
              Attach file
            </Button>
            {lastUpload ? <span className="upload-selected-file">{lastUpload.name}</span> : null}
          </div>
          <input
            ref={fileRef}
            className="upload-input-hidden"
            type="file"
            accept=".zip,.rar,.7z,.tar,.gz,.tgz,.js,.jsx,.ts,.tsx,.json,.py,.java,.go,.rs,.c,.cpp,.cs,.sh,.sql,.html,.css,.xml,.yaml,.yml,.md,.txt,.pdf,.doc,.docx,.odt,.rtf,.xls,.xlsx,.ppt,.pptx"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
          {upload.isPending ? <p>Uploading: {uploadProgress ?? 0}%</p> : null}
          {upload.isPending ? (
            <Button variant="secondary" onClick={() => uploadController.current?.abort()}>
              Cancel upload
            </Button>
          ) : null}
          {upload.isSuccess ? <p>Upload complete</p> : null}
          {uploadError ? (
            <>
              <p role="alert">{uploadError}</p>
              {lastUpload ? (
                <Button variant="secondary" onClick={() => upload.mutate(lastUpload)}>
                  Retry upload
                </Button>
              ) : null}
            </>
          ) : null}
        </section>
      )}
      <section className="project-list versions-section" aria-label="Upload versions">
        <h2>Versions</h2>
        {uploads.data?.data.length ? (
          uploads.data.data.map((version) => (
            <Card key={version.id}>
              <strong>
                Version {version.version} {version.sourceType === 'GITHUB' ? '· GitHub commit' : ''}
              </strong>
              {version.sourceType === 'GITHUB' ? (
                <>
                  <p>
                    <a
                      href={
                        version.sourceRepo && version.sourceCommit
                          ? `${version.sourceRepo}/commit/${version.sourceCommit}`
                          : (version.sourceRepo ?? undefined)
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {version.sourceCommit?.slice(0, 8) ?? 'Unknown commit'}
                    </a>{' '}
                    · {version.sourceMessage?.split('\n')[0] || 'No commit message'}
                  </p>
                  <small>
                    {version.sourceCommittedAt
                      ? new Date(version.sourceCommittedAt).toLocaleString()
                      : 'Commit date unavailable'}
                  </small>
                </>
              ) : (
                <p>
                  {version.status} · {version.size} bytes
                </p>
              )}
              <Button
                variant="secondary"
                disabled={version.status !== 'COMPLETED'}
                onClick={() => setSelectedUploadId(version.id)}
              >
                {selectedUploadId === version.id ? 'Selected for analysis' : 'Use for analysis'}
              </Button>
              {version.sourceType !== 'GITHUB' ? (
                <Button
                  variant="ghost"
                  disabled={removeUpload.isPending}
                  onClick={() => setDeleteVersionId(version.id)}
                >
                  Delete version
                </Button>
              ) : null}
            </Card>
          ))
        ) : (
          <EmptyState
            title="No uploads yet"
            description="Upload an archive, source file, document, or PDF to create the first version."
          />
        )}
      </section>
      <Modal
        isOpen={Boolean(deleteVersionId)}
        title="Delete this local version?"
        onClose={() => setDeleteVersionId(undefined)}
      >
        <p>The uploaded version will be removed from this project.</p>
        <Button variant="secondary" onClick={() => setDeleteVersionId(undefined)}>
          Cancel
        </Button>{' '}
        <Button
          isLoading={removeUpload.isPending}
          onClick={() => {
            if (!deleteVersionId) return;
            removeUpload.mutate(deleteVersionId);
            setDeleteVersionId(undefined);
          }}
        >
          Delete version
        </Button>
      </Modal>
    </section>
  );
}
