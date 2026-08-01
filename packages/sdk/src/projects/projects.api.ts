import type { PaginatedResponse, Project } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export interface CreateProjectRequest {
  readonly name: string;
  readonly description?: string;
  readonly language?: string;
  readonly tags?: string[];
}

export class ProjectsAPI {
  constructor(private readonly client: ApiClient) {}

  list(): Promise<PaginatedResponse<Project>> {
    return this.client.get<PaginatedResponse<Project>>('/projects');
  }

  get(projectId: string): Promise<Project> {
    return this.client.get<Project>(`/projects/${projectId}`);
  }

  create(payload: CreateProjectRequest): Promise<Project> {
    return this.client.post<Project, CreateProjectRequest>('/projects', payload);
  }
}
