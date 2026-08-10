import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminService } from '../../../../src/modules/admin/admin.service';

describe('AdminService', () => {
  const prisma = {
    user: { count: vi.fn(), findUnique: vi.fn() },
    project: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    projectHistory: { findMany: vi.fn() },
    scan: { count: vi.fn(), findMany: vi.fn() },
    scanStep: { groupBy: vi.fn() },
    report: { count: vi.fn() },
    aIUsage: { aggregate: vi.fn() },
    aIRequest: { count: vi.fn(), findMany: vi.fn() },
    adminLog: { findMany: vi.fn(), count: vi.fn() },
  };
  const queues = {
    getAllQueueMetrics: vi.fn(),
    listJobs: vi.fn(),
    retryJob: vi.fn(),
    getJob: vi.fn(),
    removeJob: vi.fn(),
  };
  const service = new AdminService(prisma as never, queues as never);

  beforeEach(() => vi.clearAllMocks());

  it('aggregates overview from backend-owned data', async () => {
    prisma.user.count.mockResolvedValueOnce(10).mockResolvedValueOnce(7);
    prisma.project.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1);
    prisma.scan.count.mockResolvedValue(8);
    prisma.report.count.mockResolvedValue(6);
    prisma.aIUsage.aggregate.mockResolvedValue({ _count: { id: 12 }, _sum: { tokensUsed: 900 } });

    await expect(service.overview()).resolves.toEqual({
      users: 10,
      activeUsers: 7,
      projects: 4,
      archivedProjects: 1,
      analyses: 8,
      reports: 6,
      aiRequests: 12,
      aiTokens: 900,
    });
  });

  it('returns user projects and recent activity for admin details', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      avatarUrl: null,
      role: 'USER',
      isActive: true,
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-01'),
    });
    prisma.project.findMany.mockResolvedValue([]);
    prisma.projectHistory.findMany.mockResolvedValue([]);
    await expect(service.userDetails('user-1')).resolves.toEqual({
      user: expect.objectContaining({ id: 'user-1', email: 'user@example.com' }),
      projects: [],
      activity: [],
    });
  });

  it('returns project owner, versions and analyses for admin details', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      ownerId: 'user-1',
      name: 'Reviewsha',
      description: null,
      language: 'TS',
      status: 'ACTIVE',
      visibility: 'PRIVATE',
      archivedAt: null,
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-02'),
      tags: [],
      scans: [],
      uploadedFiles: [],
      _count: { scans: 0, uploadedFiles: 0, reports: 0 },
      owner: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        avatarUrl: null,
        role: 'USER',
        isActive: true,
        createdAt: new Date('2026-08-01'),
        updatedAt: new Date('2026-08-01'),
      },
    });
    await expect(service.projectDetails('project-1')).resolves.toMatchObject({
      project: expect.objectContaining({ id: 'project-1' }),
      owner: expect.objectContaining({ id: 'user-1' }),
      versions: [],
      analyses: [],
    });
  });

  it('returns paginated queue jobs', async () => {
    queues.listJobs.mockResolvedValue({ items: [{ id: 'job-1' }], total: 41 });
    await expect(service.queueJobs('ai.queue', 2, 20, 'failed')).resolves.toEqual({
      items: [{ id: 'job-1' }],
      total: 41,
      meta: { page: 2, limit: 20, total: 41, pages: 3 },
    });
    expect(queues.listJobs).toHaveBeenCalledWith('ai.queue', 2, 20, 'failed');
  });

  it('returns a safe queue job summary without exposing payload data', async () => {
    queues.getJob.mockResolvedValue({
      id: 'job-1',
      name: 'analyze',
      timestamp: Date.parse('2026-08-10T10:00:00.000Z'),
      attemptsMade: 2,
      getState: vi.fn().mockResolvedValue('failed'),
      failedReason: 'provider timeout',
      data: { secret: 'must-not-leak' },
    });
    await expect(service.queueJob('ai.queue', 'job-1')).resolves.toEqual({
      id: 'job-1',
      name: 'analyze',
      state: 'failed',
      attemptsMade: 2,
      createdAt: '2026-08-10T10:00:00.000Z',
      failedReason: 'provider timeout',
    });
  });

  it('returns AI usage without exposing provider secrets', async () => {
    prisma.aIUsage.aggregate.mockResolvedValue({ _count: { id: 4 }, _sum: { tokensUsed: 1200 } });
    prisma.aIRequest.count.mockResolvedValueOnce(9).mockResolvedValueOnce(2);
    prisma.aIRequest.findMany.mockResolvedValue([
      {
        id: 'request-1',
        provider: 'omniroute',
        model: 'deepseek-chat',
        error: 'timeout',
        createdAt: new Date('2026-08-10T10:00:00Z'),
        response: null,
        scan: { project: { name: 'Reviewsha' } },
      },
    ]);
    await expect(service.aiUsage()).resolves.toEqual({
      requests: 9,
      usageRecords: 4,
      tokens: 1200,
      failures: 2,
      failuresList: [
        {
          id: 'request-1',
          provider: 'omniroute',
          model: 'deepseek-chat',
          error: 'timeout',
          createdAt: '2026-08-10T10:00:00.000Z',
          latencyMs: null,
          project: 'Reviewsha',
        },
      ],
    });
  });

  it('returns backend-owned processing statistics and duration metrics', async () => {
    prisma.user.count.mockResolvedValue(2);
    prisma.project.count.mockResolvedValue(3);
    prisma.scan.count.mockResolvedValueOnce(4).mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    prisma.scanStep.groupBy.mockResolvedValue([
      { type: 'PARSE', status: 'COMPLETED', _count: { _all: 3 } },
      { type: 'PARSE', status: 'FAILED', _count: { _all: 1 } },
    ]);
    prisma.scan.findMany.mockResolvedValue([
      { startedAt: new Date('2026-08-10T10:00:00Z'), finishedAt: new Date('2026-08-10T10:00:10Z') },
    ]);
    await expect(service.statistics()).resolves.toMatchObject({
      users: 2,
      projects: 3,
      analyses: 4,
      completedAnalyses: 3,
      failedAnalyses: 1,
      successRate: 75,
      averageDurationMs: 10_000,
      processing: [{ type: 'PARSE', total: 4, completed: 3, failed: 1, running: 0 }],
    });
  });

  it('searches paginated logs server-side', async () => {
    prisma.adminLog.findMany.mockResolvedValue([{ id: 'log-1', message: 'timeout' }]);
    prisma.adminLog.count.mockResolvedValue(1);
    await expect(
      service.logs({ search: 'timeout', level: 'ERROR', page: 2, limit: 10 }),
    ).resolves.toEqual({
      items: [{ id: 'log-1', message: 'timeout' }],
      meta: { page: 2, limit: 10, total: 1, pages: 1 },
    });
    expect(prisma.adminLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('rejects unknown queues before touching BullMQ', async () => {
    await expect(service.queueJobs('not-a-queue')).rejects.toThrow('Queue not found');
    expect(queues.listJobs).not.toHaveBeenCalled();
  });

  it('retries and removes jobs through QueueService', async () => {
    queues.retryJob.mockResolvedValue(undefined);
    queues.getJob.mockResolvedValue({ id: 'job-1' });
    queues.removeJob.mockResolvedValue(undefined);
    await service.retryJob('ai.queue', 'job-1');
    await service.removeJob('ai.queue', 'job-1');
    expect(queues.retryJob).toHaveBeenCalledWith('ai.queue', 'job-1');
    expect(queues.removeJob).toHaveBeenCalledWith('ai.queue', 'job-1');
  });
});
