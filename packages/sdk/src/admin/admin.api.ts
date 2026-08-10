import type { Project, QueueJob, User } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export interface AdminOverview {
  readonly users: number;
  readonly activeUsers: number;
  readonly projects: number;
  readonly archivedProjects: number;
  readonly analyses: number;
  readonly reports: number;
  readonly aiRequests: number;
  readonly aiTokens: number;
}

export interface QueueMetrics {
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly delayed: number;
  readonly paused: number;
}

export interface QueueJobSummary {
  readonly id: string;
  readonly name: string;
  readonly state: string;
  readonly attemptsMade: number;
  readonly createdAt: string;
  readonly processedOn?: string;
  readonly finishedOn?: string;
  readonly failedReason?: string;
}

export interface AdminAiUsage {
  readonly requests: number;
  readonly usageRecords: number;
  readonly tokens: number;
  readonly failures: number;
}

export interface AdminStatistics {
  readonly users: number;
  readonly projects: number;
  readonly analyses: number;
  readonly completedAnalyses: number;
  readonly failedAnalyses: number;
}

export interface AdminLog {
  readonly id: string;
  readonly level: string;
  readonly service: string;
  readonly context?: string | null;
  readonly message: string;
  readonly requestId?: string | null;
  readonly traceId?: string | null;
  readonly stack?: string | null;
  readonly createdAt: string;
}

export interface AdminUserListResponse {
  readonly items: readonly User[];
  readonly meta: { page: number; limit: number; total: number; pages: number };
}

export interface AdminProjectListResponse {
  readonly data: readonly Project[];
  readonly meta: { page: number; limit: number; total: number; pages: number };
}

export class AdminAPI {
  constructor(private readonly client: ApiClient) {}

  overview(): Promise<AdminOverview> {
    return this.client.get<AdminOverview>('/admin/overview');
  }

  queueOverview(): Promise<Record<string, QueueMetrics>> {
    return this.client.get<Record<string, QueueMetrics>>('/admin/queues');
  }

  aiUsage(): Promise<AdminAiUsage> {
    return this.client.get<AdminAiUsage>('/admin/ai-usage');
  }

  statistics(): Promise<AdminStatistics> {
    return this.client.get<AdminStatistics>('/admin/statistics');
  }

  logs(params?: {
    page?: number;
    limit?: number;
    level?: string;
    service?: string;
    search?: string;
  }): Promise<{
    items: readonly AdminLog[];
    meta: { page: number; limit: number; total: number; pages: number };
  }> {
    return this.client.get('/admin/logs', { params });
  }

  queueJobs(
    queueName: string,
    params?: { page?: number; limit?: number },
  ): Promise<{
    items: readonly QueueJobSummary[];
    meta: { page: number; limit: number; total: number; pages: number };
  }> {
    return this.client.get(`/admin/queues/${queueName}/jobs`, { params });
  }

  retryJob(queueName: string, jobId: string): Promise<{ ok: true }> {
    return this.client.post(`/admin/queues/${queueName}/jobs/${jobId}/retry`);
  }

  removeJob(queueName: string, jobId: string): Promise<void> {
    return this.client.delete(`/admin/queues/${queueName}/jobs/${jobId}`);
  }

  users(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<AdminUserListResponse> {
    return this.client.get<AdminUserListResponse>('/users', { params });
  }

  projects(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<AdminProjectListResponse> {
    return this.client.get<AdminProjectListResponse>('/projects', { params });
  }

  queues(): Promise<QueueJob[]> {
    return this.client.get<QueueJob[]>('/admin/queues');
  }
}
