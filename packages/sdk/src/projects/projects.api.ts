import type { Project } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export interface CreateProjectRequest {
  readonly name: string;
  readonly description?: string;
  readonly language?: string;
  readonly visibility?: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
}

export interface UpdateProjectRequest {
  readonly name?: string;
  readonly description?: string | null;
  readonly language?: string | null;
  readonly visibility?: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
}

export interface ProjectEnvelope {
  readonly data: Project;
}

export interface ProjectsListResponse {
  readonly data: readonly Project[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export interface ProjectListParams {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  readonly visibility?: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
  readonly sort?: 'createdAt' | 'updatedAt' | 'name';
  readonly order?: 'asc' | 'desc';
}

export class ProjectsAPI {
  constructor(private readonly client: ApiClient) {}

  list(params?: ProjectListParams): Promise<ProjectsListResponse> {
    return this.client.get<ProjectsListResponse>('/projects', { params });
  }

  get(projectId: string): Promise<ProjectEnvelope> {
    return this.client.get<ProjectEnvelope>(`/projects/${projectId}`);
  }

  create(payload: CreateProjectRequest): Promise<ProjectEnvelope> {
    return this.client.post<ProjectEnvelope, CreateProjectRequest>('/projects', payload);
  }

  update(projectId: string, payload: UpdateProjectRequest): Promise<ProjectEnvelope> {
    return this.client.patch<ProjectEnvelope, UpdateProjectRequest>(
      `/projects/${projectId}`,
      payload,
    );
  }

  archive(projectId: string): Promise<ProjectEnvelope> {
    return this.client.post<ProjectEnvelope>(`/projects/${projectId}/archive`);
  }

  remove(projectId: string): Promise<void> {
    return this.client.delete<void>(`/projects/${projectId}`);
  }
}
