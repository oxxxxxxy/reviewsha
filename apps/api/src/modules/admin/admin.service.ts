import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService, type QueueJobSummary, type QueueMetrics } from '../queue/queue.service';
import { QUEUE_NAME_LIST, type QueueJobStatus, type QueueName } from '../queue/queue.constants';
import { ProjectMapper } from '../projects/mappers/project.mapper';
import { UserMapper } from '../users/mappers/user.mapper';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
  ) {}

  async userDetails(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const [projects, activity] = await Promise.all([
      this.prisma.project.findMany({
        where: { ownerId: id, deletedAt: null },
        include: {
          tags: true,
          scans: {
            where: { status: 'COMPLETED', deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
          _count: { select: { scans: true, uploadedFiles: true, reports: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.projectHistory.findMany({
        where: { project: { ownerId: id } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { actor: { select: { email: true } }, project: { select: { name: true } } },
      }),
    ]);
    return {
      user: UserMapper.toResponse(user),
      projects: ProjectMapper.toResponseList(projects),
      activity: activity.map((item) => ({
        id: item.id,
        project: item.project.name,
        action: item.action,
        actorEmail: item.actor.email,
        changedFields: item.changedFields,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  async projectDetails(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: true,
        tags: true,
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            status: true,
            createdAt: true,
            finishedAt: true,
            report: { select: { score: true } },
          },
        },
        uploadedFiles: {
          where: { deletedAt: null },
          orderBy: { version: 'desc' },
          take: 50,
          select: { version: true, size: true, status: true, createdAt: true },
        },
        _count: { select: { scans: true, uploadedFiles: true, reports: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return {
      project: ProjectMapper.toResponse(ProjectMapper.toEntity(project)),
      owner: UserMapper.toResponse(project.owner),
      versions: project.uploadedFiles.map((item) => ({
        version: item.version,
        size: Number(item.size),
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
      analyses: project.scans.map((item) => ({
        id: item.id,
        status: item.status,
        score: item.report?.score ?? null,
        createdAt: item.createdAt.toISOString(),
        finishedAt: item.finishedAt?.toISOString() ?? null,
      })),
    };
  }

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

  async aiUsage(
    params: {
      from?: string;
      to?: string;
      provider?: string;
      model?: string;
      userId?: string;
      projectId?: string;
    } = {},
  ) {
    const createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
    const requestWhere = {
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(params.provider ? { provider: params.provider } : {}),
      ...(params.model ? { model: params.model } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.projectId ? { scan: { projectId: params.projectId } } : {}),
    };
    const usageWhere = {
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(params.model ? { model: params.model } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.projectId ? { projectId: params.projectId } : {}),
    };
    const [usage, requests, failures, failureItems] = await Promise.all([
      this.prisma.aIUsage.aggregate({
        where: usageWhere,
        _sum: { tokensUsed: true },
        _count: { id: true },
      }),
      this.prisma.aIRequest.count({ where: requestWhere }),
      this.prisma.aIRequest.count({ where: { ...requestWhere, status: 'FAILED' } }),
      this.prisma.aIRequest.findMany({
        where: { ...requestWhere, status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          provider: true,
          model: true,
          error: true,
          createdAt: true,
          response: { select: { durationMs: true } },
          scan: { select: { project: { select: { name: true } } } },
        },
      }),
    ]);
    return {
      requests,
      usageRecords: usage._count.id,
      tokens: usage._sum.tokensUsed ?? 0,
      failures,
      failuresList: failureItems.map((item) => ({
        id: item.id,
        provider: item.provider,
        model: item.model,
        error: item.error,
        createdAt: item.createdAt.toISOString(),
        latencyMs: item.response?.durationMs ?? null,
        project: item.scan.project.name,
      })),
    };
  }

  async aiUsageBreakdown(params: Parameters<AdminService['aiUsage']>[0] = {}) {
    const createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
    const requestWhere = {
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(params.provider ? { provider: params.provider } : {}),
      ...(params.model ? { model: params.model } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.projectId ? { scan: { projectId: params.projectId } } : {}),
    };
    const usageWhere = {
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(params.model ? { model: params.model } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.projectId ? { projectId: params.projectId } : {}),
    };
    const [providers, users, projects] = await Promise.all([
      this.prisma.aIRequest.groupBy({
        by: ['provider'],
        where: requestWhere,
        _count: { id: true },
        _sum: { totalTokens: true, cost: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.aIUsage.groupBy({
        by: ['userId'],
        where: usageWhere,
        _sum: { tokensUsed: true, requestCount: true },
        orderBy: { _sum: { tokensUsed: 'desc' } },
      }),
      this.prisma.aIUsage.groupBy({
        by: ['projectId'],
        where: usageWhere,
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
    const [users, projects, analyses, completedAnalyses, failedAnalyses, steps, durations] =
      await Promise.all([
        this.prisma.user.count({
          where: { deletedAt: null, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
        }),
        this.prisma.project.count({
          where: { deletedAt: null, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
        }),
        this.prisma.scan.count({
          where: Object.keys(createdAt).length ? { createdAt } : undefined,
        }),
        this.prisma.scan.count({
          where: { status: 'COMPLETED', ...(Object.keys(createdAt).length ? { createdAt } : {}) },
        }),
        this.prisma.scan.count({
          where: { status: 'FAILED', ...(Object.keys(createdAt).length ? { createdAt } : {}) },
        }),
        this.prisma.scanStep.groupBy({
          by: ['type', 'status'],
          where: Object.keys(createdAt).length ? { createdAt } : undefined,
          _count: { _all: true },
        }),
        this.prisma.scan.findMany({
          where: {
            startedAt: { not: null },
            finishedAt: { not: null },
            ...(Object.keys(createdAt).length ? { createdAt } : {}),
          },
          select: { startedAt: true, finishedAt: true },
        }),
      ]);
    const processing = [...new Set(steps.map((step) => step.type))].map((type) => {
      const rows = steps.filter((step) => step.type === type);
      return {
        type,
        total: rows.reduce((sum, row) => sum + row._count._all, 0),
        completed: rows.find((row) => row.status === 'COMPLETED')?._count._all ?? 0,
        failed: rows.find((row) => row.status === 'FAILED')?._count._all ?? 0,
        running: rows.find((row) => row.status === 'RUNNING')?._count._all ?? 0,
      };
    });
    const durationsMs = durations
      .filter((item) => item.startedAt && item.finishedAt)
      .map((item) => item.finishedAt!.getTime() - item.startedAt!.getTime());
    return {
      users,
      projects,
      analyses,
      completedAnalyses,
      failedAnalyses,
      successRate: analyses ? Number(((completedAnalyses / analyses) * 100).toFixed(2)) : 0,
      averageDurationMs: durationsMs.length
        ? Math.round(durationsMs.reduce((sum, value) => sum + value, 0) / durationsMs.length)
        : 0,
      processing,
    };
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
              { event: { contains: params.search, mode: 'insensitive' as const } },
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
          event: true,
          message: true,
          requestId: true,
          traceId: true,
          userId: true,
          projectId: true,
          jobId: true,
          metadata: true,
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
        event: true,
        message: true,
        requestId: true,
        traceId: true,
        userId: true,
        projectId: true,
        jobId: true,
        metadata: true,
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
    state?: string,
  ): Promise<{
    items: QueueJobSummary[];
    meta: { page: number; limit: number; total: number; pages: number };
  }> {
    this.assertQueue(queueName);
    const result = await this.queues.listJobs(
      queueName as QueueName,
      page,
      limit,
      state as QueueJobStatus | undefined,
    );
    return {
      ...result,
      meta: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    };
  }

  async queueJob(queueName: string, jobId: string): Promise<QueueJobSummary> {
    this.assertQueue(queueName);
    const job = await this.queues.getJob(queueName as QueueName, jobId);
    if (!job) throw new NotFoundException('Queue job not found');
    return {
      id: String(job.id),
      name: job.name,
      state: (await job.getState()) as QueueJobStatus,
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp).toISOString(),
      ...(job.processedOn ? { processedOn: new Date(job.processedOn).toISOString() } : {}),
      ...(job.finishedOn ? { finishedOn: new Date(job.finishedOn).toISOString() } : {}),
      ...(job.failedReason ? { failedReason: job.failedReason } : {}),
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
