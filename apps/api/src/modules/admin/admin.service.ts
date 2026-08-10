import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService, type QueueJobSummary, type QueueMetrics } from '../queue/queue.service';
import { QUEUE_NAME_LIST, type QueueName } from '../queue/queue.constants';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  async overview() {
    const [users, activeUsers, projects, archivedProjects, analyses, reports, aiUsage] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { deletedAt: null, isActive: true } }),
        this.prisma.project.count({ where: { deletedAt: null } }),
        this.prisma.project.count({ where: { status: 'ARCHIVED', deletedAt: null } }),
        this.prisma.scan.count(),
        this.prisma.report.count(),
        this.prisma.aIUsage.aggregate({ _sum: { tokensUsed: true }, _count: { id: true } }),
      ]);
    return {
      users,
      activeUsers,
      projects,
      archivedProjects,
      analyses,
      reports,
      aiRequests: aiUsage._count.id,
      aiTokens: aiUsage._sum.tokensUsed ?? 0,
    };
  }

  async queueOverview(): Promise<Record<QueueName, QueueMetrics>> {
    return this.queues.getAllQueueMetrics();
  }

  async aiUsage() {
    const [usage, requests, failures] = await Promise.all([
      this.prisma.aIUsage.aggregate({ _sum: { tokensUsed: true }, _count: { id: true } }),
      this.prisma.aIRequest.count(),
      this.prisma.aIRequest.count({ where: { status: 'FAILED' } }),
    ]);
    return {
      requests,
      usageRecords: usage._count.id,
      tokens: usage._sum.tokensUsed ?? 0,
      failures,
    };
  }

  async aiUsageBreakdown() {
    const [providers, users, projects] = await Promise.all([
      this.prisma.aIRequest.groupBy({
        by: ['provider'],
        _count: { id: true },
        _sum: { totalTokens: true, cost: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.aIUsage.groupBy({
        by: ['userId'],
        _sum: { tokensUsed: true, requestCount: true },
        orderBy: { _sum: { tokensUsed: 'desc' } },
      }),
      this.prisma.aIUsage.groupBy({
        by: ['projectId'],
        _sum: { tokensUsed: true, requestCount: true },
        orderBy: { _sum: { tokensUsed: 'desc' } },
      }),
    ]);
    const userIds = users.flatMap((item) => (item.userId ? [item.userId] : []));
    const projectIds = projects.map((item) => item.projectId);
    const [userRecords, projectRecords] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      }),
      this.prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true },
      }),
    ]);
    const userLabels = new Map(userRecords.map((user) => [user.id, user.email]));
    const projectLabels = new Map(projectRecords.map((project) => [project.id, project.name]));
    return {
      providers: providers.map((item) => ({
        key: item.provider,
        label: item.provider,
        requests: item._count.id,
        tokens: item._sum.totalTokens ?? 0,
        cost: Number(item._sum.cost ?? 0),
      })),
      users: users.map((item) => ({
        key: item.userId ?? 'unknown',
        label: item.userId ? (userLabels.get(item.userId) ?? null) : null,
        requests: item._sum.requestCount ?? 0,
        tokens: item._sum.tokensUsed ?? 0,
        cost: 0,
      })),
      projects: projects.map((item) => ({
        key: item.projectId,
        label: projectLabels.get(item.projectId) ?? null,
        requests: item._sum.requestCount ?? 0,
        tokens: item._sum.tokensUsed ?? 0,
        cost: 0,
      })),
    };
  }

  async statistics(params: { from?: string; to?: string } = {}) {
    const createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
    const [users, projects, analyses, completedAnalyses, failedAnalyses] = await Promise.all([
      this.prisma.user.count({
        where: { deletedAt: null, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      }),
      this.prisma.project.count({
        where: { deletedAt: null, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      }),
      this.prisma.scan.count({ where: Object.keys(createdAt).length ? { createdAt } : undefined }),
      this.prisma.scan.count({
        where: { status: 'COMPLETED', ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      }),
      this.prisma.scan.count({
        where: { status: 'FAILED', ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      }),
    ]);
    return { users, projects, analyses, completedAnalyses, failedAnalyses };
  }

  async logs(params: {
    page?: number;
    limit?: number;
    level?: string;
    service?: string;
    search?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const where = {
      ...(params.level ? { level: params.level } : {}),
      ...(params.service ? { service: params.service } : {}),
      ...(params.search
        ? {
            OR: [
              { message: { contains: params.search, mode: 'insensitive' as const } },
              { context: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          level: true,
          service: true,
          context: true,
          message: true,
          requestId: true,
          traceId: true,
          stack: true,
          createdAt: true,
        },
      }),
      this.prisma.adminLog.count({ where }),
    ]);
    return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async log(id: string) {
    const item = await this.prisma.adminLog.findUnique({
      where: { id },
      select: {
        id: true,
        level: true,
        service: true,
        context: true,
        message: true,
        requestId: true,
        traceId: true,
        stack: true,
        createdAt: true,
      },
    });
    if (!item) throw new NotFoundException('Log entry not found');
    return item;
  }

  async queueJobs(
    queueName: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: QueueJobSummary[];
    meta: { page: number; limit: number; total: number; pages: number };
  }> {
    this.assertQueue(queueName);
    const result = await this.queues.listJobs(queueName as QueueName, page, limit);
    return {
      ...result,
      meta: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    };
  }

  async retryJob(queueName: string, jobId: string): Promise<{ ok: true }> {
    this.assertQueue(queueName);
    await this.queues.retryJob(queueName as QueueName, jobId);
    return { ok: true };
  }

  async removeJob(queueName: string, jobId: string): Promise<void> {
    this.assertQueue(queueName);
    const job = await this.queues.getJob(queueName as QueueName, jobId);
    if (!job) throw new NotFoundException('Queue job not found');
    await this.queues.removeJob(queueName as QueueName, jobId);
  }

  private assertQueue(queueName: string): asserts queueName is QueueName {
    if (!QUEUE_NAME_LIST.includes(queueName as QueueName)) {
      throw new NotFoundException('Queue not found');
    }
  }
}
