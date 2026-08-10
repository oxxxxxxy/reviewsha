import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';

export type AdminOverview = components['schemas']['AdminOverviewResponseDto'];

export type QueueMetrics = components['schemas']['QueueMetricsResponseDto'];
export type QueueOverview = components['schemas']['QueueOverviewResponseDto'];
export type QueueJobSummary = components['schemas']['AdminJobResponseDto'];
export type QueueJobsResponse = components['schemas']['AdminJobsResponseDto'];

export type AdminAiUsage = components['schemas']['AdminAiUsageResponseDto'];
export type AdminAiUsageBreakdown = components['schemas']['AdminAiUsageBreakdownResponseDto'];

export type AdminStatistics = components['schemas']['AdminStatisticsResponseDto'];
export type AdminUserDetails = components['schemas']['AdminUserDetailsResponseDto'];
export type AdminProjectDetails = components['schemas']['AdminProjectDetailsResponseDto'];

export type AdminLog = components['schemas']['AdminLogResponseDto'];

export class AdminAPI {
  constructor(private readonly client: ApiClient) {}

  overview(): Promise<AdminOverview> {
    return this.client.get<AdminOverview>('/admin/overview');
  }

  queueOverview(): Promise<QueueOverview> {
    return this.client.get<QueueOverview>('/admin/queues');
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

  log(id: string, signal?: AbortSignal): Promise<AdminLog> {
    return this.client.get<AdminLog>(`/admin/logs/${id}`, { signal });
  }

  queueJobs(
    queueName: string,
    params?: { page?: number; limit?: number; state?: string },
  ): Promise<QueueJobsResponse> {
    return this.client.get<QueueJobsResponse>(`/admin/queues/${queueName}/jobs`, { params });
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
  }): Promise<components['schemas']['UsersListResponseDto']> {
    return this.client.get('/users', { params });
  }

  user(userId: string): Promise<components['schemas']['UserResponseDto']> {
    return this.client.get(`/users/${userId}`);
  }

  userDetails(userId: string): Promise<AdminUserDetails> {
    return this.client.get<AdminUserDetails>(`/admin/users/${userId}/details`);
  }

  projects(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<components['schemas']['ProjectsListResponseDto']> {
    return this.client.get('/projects', { params });
  }

  project(projectId: string): Promise<components['schemas']['ProjectResponseEnvelopeDto']> {
    return this.client.get(`/projects/${projectId}`);
  }

  projectDetails(projectId: string): Promise<AdminProjectDetails> {
    return this.client.get<AdminProjectDetails>(`/admin/projects/${projectId}/details`);
  }
}
