import type { Project, QueueJob, User } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

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
