import { Role, ProjectStatus, Visibility, type Project } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../../../../src/common/auth/types/auth.types';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import {
  ProjectEvents,
  PROJECT_EVENTS,
} from '../../../../src/modules/projects/events/project.events';
import { ProjectsService } from '../../../../src/modules/projects/services/projects.service';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'developer@reviewsha.local',
  role: Role.USER,
};

const admin: AuthenticatedUser = { ...user, role: Role.ADMIN };

function project(ownerId = user.id): Project {
  const now = new Date('2026-08-05T12:00:00.000Z');
  return {
    id: '00000000-0000-4000-8000-000000000010',
    ownerId,
    organizationId: null,
    name: 'Reviewsha API',
    description: 'Backend',
    language: 'TypeScript',
    visibility: Visibility.PRIVATE,
    status: ProjectStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
  };
}

function projectDetails(ownerId = user.id) {
  return {
    ...project(ownerId),
    tags: [{ id: 'tag-id', projectId: project().id, name: 'backend', createdAt: new Date() }],
    _count: { scans: 2, uploadedFiles: 3 },
    scans: [{ createdAt: new Date('2026-08-04T00:00:00.000Z') }],
  };
}

function setup() {
  const repository = {
    findMany: vi.fn(async () => ({ items: [project()], total: 1 })),
    findByOwnerAndName: vi.fn(async () => null),
    findActiveById: vi.fn(async () => projectDetails()),
    findActiveByIdForOwner: vi.fn(async (_id: string, ownerId: string) =>
      ownerId === user.id ? projectDetails() : null,
    ),
    create: vi.fn(async () => project()),
    update: vi.fn(async () => project()),
    archive: vi.fn(async () => ({
      ...project(),
      status: ProjectStatus.ARCHIVED,
      archivedAt: new Date(),
    })),
    delete: vi.fn(async () => ({
      ...project(),
      status: ProjectStatus.DELETED,
      deletedAt: new Date(),
    })),
    restore: vi.fn(async () => ({ ...project(), status: ProjectStatus.ACTIVE })),
    syncTags: vi.fn(async () => undefined),
    createHistory: vi.fn(async () => undefined),
    findHistory: vi.fn(async () => []),
    findByIdForOwnerIncludingDeleted: vi.fn(async () => projectDetails()),
  };
  const events = new ProjectEvents();
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as ApiLoggerService;
  const service = new ProjectsService(repository as never, events, logger);
  return { repository, events, service };
}

describe('ProjectsService', () => {
  it('lists only projects in the authenticated user scope', async () => {
    const { service, repository } = setup();

    await service.findAll(user, { page: 1, limit: 20, sort: 'createdAt', order: 'desc' });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: user.id, skip: 0, take: 20 }),
    );
  });

  it('lets an administrator list all projects', async () => {
    const { service, repository } = setup();

    await service.findAll(admin, { page: 1, limit: 20, sort: 'createdAt', order: 'desc' });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: undefined }),
    );
  });

  it('creates a project for the current user and publishes an event', async () => {
    const { service, repository, events } = setup();
    const listener = vi.fn();
    events.on(PROJECT_EVENTS.created, listener);

    const result = await service.create(user, { name: ' New project ', language: ' TypeScript ' });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ owner: { connect: { id: user.id } }, name: 'New project' }),
    );
    expect(result.data.id).toBe(project().id);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ projectId: project().id }));
  });

  it('does not expose another user project to a regular user', async () => {
    const { service } = setup();

    await expect(
      service.findById({ ...user, id: '00000000-0000-4000-8000-000000000099' }, project().id),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('allows an administrator to access any active project', async () => {
    const { service, repository } = setup();

    await service.findById(admin, project().id);

    expect(repository.findActiveById).toHaveBeenCalledWith(project().id);
  });

  it('rejects empty updates', async () => {
    const { service } = setup();

    await expect(service.update(user, project().id, {})).rejects.toMatchObject({ status: 422 });
  });

  it('archives and deletes through the repository', async () => {
    const { service, repository } = setup();

    await service.archive(user, project().id);
    await service.delete(user, project().id);

    expect(repository.archive).toHaveBeenCalledWith(project().id);
    expect(repository.delete).toHaveBeenCalledWith(project().id);
  });

  it('normalizes tags and publishes tag events when updating', async () => {
    const { service, repository, events } = setup();
    const added = vi.fn();
    events.on(PROJECT_EVENTS.tagAdded, added);

    await service.update(user, project().id, { tags: [' Backend ', 'frontend', 'frontend'] });

    expect(repository.syncTags).toHaveBeenCalledWith(project().id, ['backend', 'frontend']);
    expect(added).toHaveBeenCalledWith(expect.objectContaining({ tag: 'frontend' }));
  });

  it('restores only archived projects and records history', async () => {
    const { service, repository } = setup();
    repository.findActiveByIdForOwner.mockResolvedValue({
      ...projectDetails(),
      status: ProjectStatus.ARCHIVED,
    });

    await service.restore(user, project().id);

    expect(repository.restore).toHaveBeenCalledWith(project().id);
    expect(repository.createHistory).toHaveBeenCalledWith(
      project().id,
      user.id,
      'RESTORED',
      expect.any(Object),
    );
  });

  it('returns project history through the scoped repository query', async () => {
    const { service, repository } = setup();
    repository.findHistory.mockResolvedValue([]);

    await expect(service.history(user, project().id)).resolves.toEqual({ data: [] });
    expect(repository.findHistory).toHaveBeenCalledWith(project().id);
  });
});
