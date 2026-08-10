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
      navigate(`/projects/${data.id}`);
    },
  });
  if (projects.isLoading) return <Loader label="Loading projects" />;
  return (
    <section className="page">
      <h1>Projects</h1>
      <div className="form">
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
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New project name"
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
        <Button
          disabled={!name.trim()}
          isLoading={create.isPending}
          onClick={() => create.mutate()}
        >
          Create project
        </Button>
        {create.isError ? <p role="alert">Unable to create project.</p> : null}
      </div>
      {projects.isError ? (
        <p role="alert">
          Unable to load projects. <button onClick={() => void projects.refetch()}>Retry</button>
        </p>
      ) : null}
      {projects.data?.data.length ? (
        <div className="project-list">
          {projects.data.data.map((project) => (
            <Card key={project.id}>
              <h2>{project.name}</h2>
              <p>{project.description || 'No description'}</p>
              <p>
                {project.status} · {project.language || 'Unknown language'}
              </p>
              <Link to={`/projects/${project.id}`}>Open</Link>
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
    </section>
  );
}

function ProjectDetails({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: ({ signal }) => reviewshaSdk.projects.get(projectId, signal),
  });
  const archive = useMutation({
    mutationFn: () => reviewshaSdk.projects.archive(projectId),
    onSuccess: () => {
      setArchiveOpen(false);
      void client.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
  const [uploadProgress, setUploadProgress] = useState<number>();
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string>();
  const uploads = useQuery({
    queryKey: ['uploads', projectId],
    queryFn: ({ signal }) => reviewshaSdk.uploads.list(projectId, signal),
  });
  const history = useQuery({
    queryKey: ['project-history', projectId],
    queryFn: ({ signal }) => reviewshaSdk.projects.history(projectId, signal),
  });
  const update = useMutation({
    mutationFn: () =>
      reviewshaSdk.projects.update(projectId, {
        name: editName.trim() || undefined,
        description: editDescription,
        tags: editTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['project', projectId] }),
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
        setUploadError('Upload failed. Check ZIP file and try again.');
    },
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
    mutationFn: () => reviewshaSdk.analyses.start(projectId),
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
  const startEditing = () => {
    setEditName(item.name);
    setEditDescription(item.description ?? '');
    setEditTags(projectTags.join(', '));
  };
  const uploadFile = (file: File) => {
    setUploadError(undefined);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUploadError('Only ZIP archives are supported.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('The ZIP file is too large. Maximum size: 100 MB.');
      return;
    }
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
      <Button variant="secondary" onClick={startEditing}>
        Edit project
      </Button>
      {editName ? (
        <section className="form" aria-label="Edit project">
          <Input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            aria-label="Project name"
          />
          <Textarea
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            aria-label="Project description"
          />
          <Input
            value={editTags}
            onChange={(event) => setEditTags(event.target.value)}
            aria-label="Project tags"
          />
          <Button isLoading={update.isPending} onClick={() => update.mutate()}>
            Save changes
          </Button>
          {update.isError ? <p role="alert">Unable to update project.</p> : null}
        </section>
      ) : null}
      <Button
        variant="secondary"
        disabled={item.status === 'ARCHIVED'}
        isLoading={archive.isPending}
        onClick={() => setArchiveOpen(true)}
      >
        Archive project
      </Button>
      <Modal
        isOpen={archiveOpen}
        title="Archive this project?"
        onClose={() => setArchiveOpen(false)}
      >
        <p>This project will become read-only according to the backend policy.</p>
        <Button variant="secondary" onClick={() => setArchiveOpen(false)}>
          Cancel
        </Button>{' '}
        <Button
          isLoading={archive.isPending}
          onClick={() => {
            archive.mutate();
            setArchiveOpen(false);
          }}
        >
          Archive project
        </Button>
      </Modal>
      <section aria-label="Analysis">
        <h2>Analysis</h2>
        {analyses.data?.data[0] ? (
          <Card>
            <Badge tone={analyses.data.data[0].status === 'COMPLETED' ? 'success' : 'warning'}>
              {analyses.data.data[0].status}
            </Badge>
            <p>
              {analyses.data.data[0].currentStep ?? 'Queued'} · {analyses.data.data[0].progress}%
            </p>
            {analyses.data.data[0].status === 'FAILED' ? (
              <p role="alert">{analyses.data.data[0].errorMessage ?? 'Analysis failed.'}</p>
            ) : null}
          </Card>
        ) : (
          <EmptyState title="Analysis hasn't started" />
        )}
        <Button
          disabled={item.status === 'ARCHIVED' || analyze.isPending}
          isLoading={analyze.isPending}
          onClick={() => analyze.mutate()}
        >
          Analyze project
        </Button>
        {analyze.isError ? <p role="alert">Unable to start analysis.</p> : null}
      </section>
      <section className="upload-panel">
        <h2>Upload ZIP</h2>
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) uploadFile(file);
          }}
          role="region"
          aria-label="ZIP upload drop zone"
        >
          Drop ZIP here or choose a file
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
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
        {uploadError ? <p role="alert">{uploadError}</p> : null}
      </section>
      <section className="project-list" aria-label="Upload versions">
        <h2>Versions</h2>
        {uploads.data?.data.length ? (
          uploads.data.data.map((version) => (
            <Card key={version.id}>
              <strong>Version {version.version}</strong>
              <p>
                {version.status} · {version.size} bytes
              </p>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No uploads yet"
            description="Upload a ZIP archive to create the first version."
          />
        )}
      </section>
      <section className="project-list" aria-label="Project history">
        <h2>History</h2>
        {history.data?.data.length ? (
          history.data.data.map((entry) => (
            <Card key={entry.id}>
              <strong>{entry.action}</strong>
              <p>
                {entry.actorEmail} · {entry.createdAt}
              </p>
            </Card>
          ))
        ) : (
          <EmptyState title="No history yet" />
        )}
      </section>
      <div className="quick-actions">
        <Link to={`/projects/${projectId}/chat`}>Open chat</Link>
        <Link to={`/projects/${projectId}/reports`}>Reports</Link>
      </div>
    </section>
  );
}
