import { Button, Card, EmptyState, Input, Loader, Textarea } from '@reviewsha/ui';
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const client = useQueryClient();
  const navigate = useNavigate();
  const projects = useQuery({
    queryKey: ['projects', search],
    queryFn: () =>
      reviewshaSdk.projects.list({ search, limit: 50, sort: 'updatedAt', order: 'desc' }),
  });
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
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects"
          aria-label="Search projects"
        />
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
    </section>
  );
}

function ProjectDetails({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => reviewshaSdk.projects.get(projectId),
  });
  const archive = useMutation({
    mutationFn: () => reviewshaSdk.projects.archive(projectId),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['project', projectId] }),
  });
  const [uploadProgress, setUploadProgress] = useState<number>();
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const uploads = useQuery({
    queryKey: ['uploads', projectId],
    queryFn: () => reviewshaSdk.uploads.list(projectId),
  });
  const history = useQuery({
    queryKey: ['project-history', projectId],
    queryFn: () => reviewshaSdk.projects.history(projectId),
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
    mutationFn: (file: File) => reviewshaSdk.uploads.upload(projectId, file, setUploadProgress),
    onSuccess: () => setUploadProgress(100),
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
        onClick={() => archive.mutate()}
      >
        Archive project
      </Button>
      <section className="upload-panel">
        <h2>Upload ZIP</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.zip')) return;
            if (file.size > 100 * 1024 * 1024) return;
            upload.mutate(file);
          }}
        />
        {upload.isPending ? <p>Uploading: {uploadProgress ?? 0}%</p> : null}
        {upload.isSuccess ? <p>Upload complete</p> : null}
        {upload.isError ? <p role="alert">Upload failed. Check ZIP file and try again.</p> : null}
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
