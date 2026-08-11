import { Badge, Button, Card, EmptyState, Input, Loader, Modal, Textarea } from '@reviewsha/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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
  const [tags, setTags] = useState('');
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
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
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
      <h1>Projects</h1>
      <div className="projects-workspace">
        <aside className="project-search-panel">
          <span className="eyebrow">Workspace</span>
          <h2>Find a project</h2>
          <Input
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
          />
          <label>
            Sort
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                setPage(1);
              }}
            >
              <option value="updatedAt">Recently updated</option>
              <option value="name">Name</option>
            </select>
          </label>
          <p className="muted">{projects.data?.meta.total ?? 0} projects</p>
        </aside>
        <form
          className="project-create-panel form"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <span className="eyebrow">New workspace</span>
          <h2>Create project</h2>
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
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags (comma separated)"
            aria-label="Project tags"
          />
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
            <Card
              key={project.id}
              className="project-card"
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/projects/${project.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') navigate(`/projects/${project.id}`);
              }}
            >
              <h2>{project.name}</h2>
              <p>{project.description || 'No description'}</p>
              <p>
                {project.status} · {project.language || 'Unknown language'}
              </p>
              <Button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/projects/${project.id}`);
                }}
              >
                Open project
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteProject({ id: project.id, name: project.name });
                }}
              >
                Delete
              </Button>
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
    },
    onError: (error) => {
      uploadController.current = undefined;
      if ((error as Error).name !== 'CanceledError')
        setUploadError('Upload failed. Check the file format and try again.');
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
    mutationFn: () => reviewshaSdk.analyses.start(projectId, selectedUploadId),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['analyses', projectId] }),
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
  const projectTags = item.tags ?? [];
  const uploadFile = (file: File) => {
    setUploadError(undefined);
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
    <section className="page">
      <Link to="/projects">← Projects</Link>
      <h1>{item.name}</h1>
      <p>{item.description || 'No description'}</p>
      <p>Status: {item.status}</p>
      <p>Language: {item.language || 'Unknown'}</p>
      <p>Tags: {projectTags.length ? projectTags.join(', ') : 'None'}</p>
      <div className="project-action-bar" role="group" aria-label="Project actions">
        <Link className="action-button project-action" to={`/projects/${projectId}/settings`}>
          Project settings
        </Link>
        <Button
          className="project-action project-action-danger"
          variant="ghost"
          isLoading={removeProject.isPending}
          onClick={() => setDeleteProjectOpen(true)}
        >
          Delete project
        </Button>
        <Button
          className="project-action"
          disabled={item.status === 'ARCHIVED' || analyze.isPending}
          isLoading={analyze.isPending}
          onClick={() => analyze.mutate()}
        >
          Start analysis
        </Button>
        <Link className="action-button project-action" to={`/projects/${projectId}/reports`}>
          Open reports
        </Link>
        <Link className="action-button project-action" to={`/projects/${projectId}/chat`}>
          Open chat
        </Link>
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
      <section aria-label="Analysis">
        <h2>Analysis</h2>
        {analyses.data?.data[0] ? (
          <Card>
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
                    <strong>{current.progress}%</strong>
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
              <p role="alert">{analyses.data.data[0].errorMessage ?? 'Analysis failed.'}</p>
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
      <section className="upload-panel">
        <h2>Upload project or file</h2>
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) uploadFile(file);
          }}
          role="region"
          aria-label="Project file upload drop zone"
        >
          Drop an archive or readable file here
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,.rar,.7z,.tar,.gz,.tgz,.js,.jsx,.ts,.tsx,.json,.py,.java,.go,.rs,.c,.cpp,.cs,.sh,.sql,.html,.css,.xml,.yaml,.yml,.md,.txt,.pdf,.doc,.docx,.odt,.rtf,.xls,.xlsx,.ppt,.pptx"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
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
      <section className="project-list versions-section" aria-label="Upload versions">
        <h2>Versions</h2>
        {uploads.data?.data.length ? (
          uploads.data.data.map((version) => (
            <Card key={version.id}>
              <strong>Version {version.version}</strong>
              <p>
                {version.status} · {version.size} bytes
              </p>
              <Button
                variant="secondary"
                disabled={version.status !== 'COMPLETED' || item.status === 'ARCHIVED'}
                onClick={() => setSelectedUploadId(version.id)}
              >
                {selectedUploadId === version.id ? 'Selected for analysis' : 'Use for analysis'}
              </Button>
              <Button
                variant="ghost"
                disabled={removeUpload.isPending || item.status === 'ARCHIVED'}
                onClick={() => setDeleteVersionId(version.id)}
              >
                Delete version
              </Button>
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
