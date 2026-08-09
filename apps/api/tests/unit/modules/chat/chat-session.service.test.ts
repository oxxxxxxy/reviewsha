import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSessionService } from '../../../../src/modules/chat/services/chat-session.service';

const user = { id: 'user-1', email: 'user@example.com', role: Role.USER };
const admin = { id: 'admin-1', email: 'admin@example.com', role: Role.ADMIN };
const now = new Date('2026-08-08T00:00:00Z');

describe('ChatSessionService', () => {
  const repository = {
    createSession: vi.fn(),
    findSession: vi.fn(),
    findSessions: vi.fn(),
    countSessions: vi.fn(),
  };
  const projects = { findByIdForOwnerIncludingDeleted: vi.fn() };
  const logger = { log: vi.fn() };
  let service: ChatSessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatSessionService(repository as never, projects as never, logger as never);
    projects.findByIdForOwnerIncludingDeleted.mockResolvedValue({ id: 'project-1' });
    repository.createSession.mockResolvedValue({
      id: 'session-1',
      title: 'New Chat',
      updatedAt: now,
      _count: { messages: 0 },
    });
  });

  it('creates a session for an owned project', async () => {
    await expect(service.create(user, 'project-1', {})).resolves.toMatchObject({
      id: 'session-1',
      title: 'New Chat',
    });
  });

  it('uses a trimmed custom title', async () => {
    await service.create(user, 'project-1', { title: '  JWT review  ' });
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'JWT review' }),
    );
  });

  it.each(['', ' ', '   '])('uses the default title for %j', async (title) => {
    await service.create(user, 'project-1', { title });
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Chat' }),
    );
  });

  it('limits project lookup to a normal owner', async () => {
    await service.create(user, 'project-1', {});
    expect(projects.findByIdForOwnerIncludingDeleted).toHaveBeenCalledWith('project-1', 'user-1');
  });

  it.each([Role.ADMIN, Role.SUPER_ADMIN])('allows %s to access any project', async (role) => {
    await service.create({ ...admin, role }, 'project-1', {});
    expect(projects.findByIdForOwnerIncludingDeleted).toHaveBeenCalledWith('project-1', undefined);
  });

  it('rejects a missing project', async () => {
    projects.findByIdForOwnerIncludingDeleted.mockResolvedValue(null);
    await expect(service.create(user, 'project-1', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a soft-deleted project', async () => {
    projects.findByIdForOwnerIncludingDeleted.mockResolvedValue({
      id: 'project-1',
      deletedAt: now,
    });
    await expect(service.create(user, 'project-1', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('logs identifiers without message content', async () => {
    await service.create(user, 'project-1', {});
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('sessionId=session-1'),
      'ChatSessionService',
    );
  });

  it('lists sessions with pagination metadata', async () => {
    repository.findSessions.mockResolvedValue([
      { id: 's1', title: 'A', updatedAt: now, _count: { messages: 2 } },
    ]);
    repository.countSessions.mockResolvedValue(7);
    await expect(service.list(user, 'project-1', { page: 2, limit: 3 })).resolves.toEqual({
      data: [{ id: 's1', title: 'A', updatedAt: now, messagesCount: 2 }],
      meta: { page: 2, limit: 3, total: 7 },
    });
  });

  it.each([
    [1, 10, 0],
    [2, 10, 10],
    [3, 25, 50],
    [5, 1, 4],
  ])('converts page %i and limit %i to skip %i', async (page, limit, skip) => {
    repository.findSessions.mockResolvedValue([]);
    repository.countSessions.mockResolvedValue(0);
    await service.list(user, 'project-1', { page, limit });
    expect(repository.findSessions).toHaveBeenCalledWith('project-1', 'user-1', skip, limit);
  });

  it('returns an owned session', async () => {
    repository.findSession.mockResolvedValue({ id: 's1', userId: 'user-1' });
    await expect(service.requireOwned(user, 's1')).resolves.toMatchObject({ id: 's1' });
  });

  it('returns not found for an unknown session', async () => {
    repository.findSession.mockResolvedValue(null);
    await expect(service.requireOwned(user, 's1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids a foreign session', async () => {
    repository.findSession.mockResolvedValue({ id: 's1', userId: 'other' });
    await expect(service.requireOwned(user, 's1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([Role.ADMIN, Role.SUPER_ADMIN])('lets %s inspect a foreign session', async (role) => {
    repository.findSession.mockResolvedValue({ id: 's1', userId: 'other' });
    await expect(service.requireOwned({ ...admin, role }, 's1')).resolves.toBeDefined();
  });
});
