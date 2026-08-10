import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminService } from '../../../../src/modules/admin/admin.service';

describe('AdminService', () => {
  const prisma = {
    user: { count: vi.fn() },
    project: { count: vi.fn() },
    scan: { count: vi.fn() },
    report: { count: vi.fn() },
    aIUsage: { aggregate: vi.fn() },
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

  it('returns paginated queue jobs', async () => {
    queues.listJobs.mockResolvedValue({ items: [{ id: 'job-1' }], total: 41 });
    await expect(service.queueJobs('ai.queue', 2, 20)).resolves.toEqual({
      items: [{ id: 'job-1' }],
      total: 41,
      meta: { page: 2, limit: 20, total: 41, pages: 3 },
    });
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
