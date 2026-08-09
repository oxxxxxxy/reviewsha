import type { PaginatedResponse, Project, QueueJob, User } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export class AdminAPI {
  constructor(private readonly client: ApiClient) {}

  users(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<User>> {
    return this.client.get<PaginatedResponse<User>>('/users', { params });
  }

  projects(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<PaginatedResponse<Project>> {
    return this.client.get<PaginatedResponse<Project>>('/projects', { params });
  }

  queues(): Promise<QueueJob[]> {
    return this.client.get<QueueJob[]>('/admin/queues');
  }
}
