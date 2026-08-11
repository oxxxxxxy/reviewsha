import { Button, Card, EmptyState, Input, Loader, Textarea } from '@reviewsha/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { reviewshaSdk } from '../../api/client';

export function ProjectSettingsPage() {
  const { id } = useParams();
  const client = useQueryClient();
  const project = useQuery({
    enabled: Boolean(id),
    queryKey: ['project', id],
    queryFn: ({ signal }) => reviewshaSdk.projects.get(id!, signal),
  });
  const item = project.data?.data;
  const [name, setName] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [tags, setTags] = useState<string>();
  const [language, setLanguage] = useState<string>();
  const update = useMutation({
    mutationFn: () =>
      reviewshaSdk.projects.update(id!, {
        name: (name ?? item?.name ?? '').trim(),
        description: description ?? item?.description ?? '',
        tags: (tags ?? item?.tags?.join(', ') ?? '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        language: language?.trim() || item?.language || null,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['project', id] });
      void client.invalidateQueries({ queryKey: ['projects'] });
    },
  });
  if (project.isLoading) return <Loader label="Loading project settings" />;
  if (project.isError || !item)
    return (
      <section className="page">
        <EmptyState title="Project not found" />
      </section>
    );
  return (
    <section className="page">
      <Link to={`/projects/${id}`}>← Project</Link>
      <h1>Project settings</h1>
      <Card>
        <div className="form">
          <Input
            value={name ?? item.name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Project name"
          />
          <Textarea
            value={description ?? item.description ?? ''}
            onChange={(event) => setDescription(event.target.value)}
            aria-label="Project description"
          />
          <Input
            value={tags ?? item.tags?.join(', ') ?? ''}
            onChange={(event) => setTags(event.target.value)}
            aria-label="Project tags"
          />
          <Input
            value={language ?? item.language ?? ''}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="Language (e.g. TypeScript)"
            aria-label="Project language"
          />
          <Button
            disabled={item.status === 'ARCHIVED'}
            isLoading={update.isPending}
            onClick={() => update.mutate()}
          >
            Save changes
          </Button>
          {update.isSuccess ? <p role="status">Project updated.</p> : null}
          {update.isError ? <p role="alert">Unable to update project.</p> : null}
        </div>
      </Card>
    </section>
  );
}
