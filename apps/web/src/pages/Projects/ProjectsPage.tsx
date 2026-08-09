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
  const client = useQueryClient();
  const navigate = useNavigate();
  const projects = useQuery({
    queryKey: ['projects', search],
    queryFn: () =>
      reviewshaSdk.projects.list({ search, limit: 50, sort: 'updatedAt', order: 'desc' }),
  });
  const create = useMutation({
    mutationFn: () => reviewshaSdk.projects.create({ name, description: description || undefined }),
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
  const fileRef = useRef<HTMLInputElement>(null);
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
  return (
    <section className="page">
      <Link to="/projects">← Projects</Link>
      <h1>{item.name}</h1>
      <p>{item.description || 'No description'}</p>
      <p>Status: {item.status}</p>
      <p>Language: {item.language || 'Unknown'}</p>
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
            if (file?.name.endsWith('.zip')) upload.mutate(file);
          }}
        />
        {upload.isPending ? <p>Uploading: {uploadProgress ?? 0}%</p> : null}
        {upload.isSuccess ? <p>Upload complete</p> : null}
        {upload.isError ? <p role="alert">Upload failed. Check ZIP file and try again.</p> : null}
      </section>
      <div className="quick-actions">
        <Link to={`/projects/${projectId}/chat`}>Open chat</Link>
        <Link to={`/projects/${projectId}/reports`}>Reports</Link>
      </div>
    </section>
  );
}
