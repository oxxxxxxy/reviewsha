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
