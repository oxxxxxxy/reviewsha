import type { PaginatedResponse, Project, QueueJob, User } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export class AdminAPI {
  constructor(private readonly client: ApiClient) {}

  users(): Promise<PaginatedResponse<User>> {
    return this.client.get<PaginatedResponse<User>>('/admin/users');
  }

  projects(): Promise<PaginatedResponse<Project>> {
    return this.client.get<PaginatedResponse<Project>>('/admin/projects');
  }

  queues(): Promise<QueueJob[]> {
    return this.client.get<QueueJob[]>('/admin/queues');
  }
}
