import type { Project, QueueJob, User } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';

export type AdminOverview = components['schemas']['AdminOverviewResponseDto'];

export type QueueMetrics = components['schemas']['QueueMetricsResponseDto'];

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

export type AdminAiUsage = components['schemas']['AdminAiUsageResponseDto'];
export type AdminAiUsageBreakdown = components['schemas']['AdminAiUsageBreakdownResponseDto'];

export type AdminStatistics = components['schemas']['AdminStatisticsResponseDto'];

export type AdminLog = components['schemas']['AdminLogResponseDto'];

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

  aiUsage(params?: {
    from?: string;
    to?: string;
    provider?: string;
    model?: string;
    userId?: string;
    projectId?: string;
  }): Promise<AdminAiUsage> {
    return this.client.get<AdminAiUsage>('/admin/ai-usage', { params });
  }

  aiUsageBreakdown(params?: Parameters<AdminAPI['aiUsage']>[0]): Promise<AdminAiUsageBreakdown> {
    return this.client.get<AdminAiUsageBreakdown>('/admin/ai-usage/breakdown', { params });
  }

  statistics(params?: { from?: string; to?: string }): Promise<AdminStatistics> {
    return this.client.get<AdminStatistics>('/admin/statistics', { params });
  }

  logs(params?: {
    page?: number;
    limit?: number;
    level?: string;
    service?: string;
    search?: string;
    from?: string;
    to?: string;
  }): Promise<{
    items: readonly AdminLog[];
    meta: { page: number; limit: number; total: number; pages: number };
  }> {
    return this.client.get('/admin/logs', { params });
  }

  log(id: string): Promise<AdminLog> {
    return this.client.get<AdminLog>(`/admin/logs/${id}`);
  }

  queueJobs(
    queueName: string,
    params?: { page?: number; limit?: number; state?: string },
  ): Promise<{
    items: readonly QueueJobSummary[];
    meta: { page: number; limit: number; total: number; pages: number };
  }> {
    return this.client.get(`/admin/queues/${queueName}/jobs`, { params });
  }

  queueJob(queueName: string, jobId: string): Promise<QueueJobSummary> {
    return this.client.get(`/admin/queues/${queueName}/jobs/${jobId}`);
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

  user(userId: string): Promise<User> {
    return this.client.get<User>(`/users/${userId}`);
  }

  projects(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<AdminProjectListResponse> {
    return this.client.get<AdminProjectListResponse>('/projects', { params });
  }

  project(projectId: string): Promise<{ data: Project }> {
    return this.client.get<{ data: Project }>(`/projects/${projectId}`);
  }

  queues(): Promise<QueueJob[]> {
    return this.client.get<QueueJob[]>('/admin/queues');
  }
}
