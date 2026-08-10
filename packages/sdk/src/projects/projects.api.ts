import type { Project } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';

/** Project request contracts derive their scalar fields from OpenAPI. */
export type CreateProjectRequest = Omit<
  components['schemas']['CreateProjectDto'],
  'tags' | 'visibility'
> & {
  readonly visibility?: components['schemas']['CreateProjectDto']['visibility'];
  readonly tags?: readonly string[];
};

export type UpdateProjectRequest = Omit<components['schemas']['UpdateProjectDto'], 'tags'> & {
  readonly tags?: readonly string[];
};

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
  readonly language?: string;
  readonly tags?: string;
  readonly createdFrom?: string;
  readonly createdTo?: string;
}

export interface ProjectHistoryItem {
  readonly id: string;
  readonly action: string;
  readonly actorId: string;
  readonly actorEmail: string;
  readonly changedFields: Record<string, unknown> | null;
  readonly createdAt: string;
}

export interface ProjectHistoryResponse {
  readonly data: readonly ProjectHistoryItem[];
}

export class ProjectsAPI {
  constructor(private readonly client: ApiClient) {}

  list(params?: ProjectListParams, signal?: AbortSignal): Promise<ProjectsListResponse> {
    return this.client.get<ProjectsListResponse>('/projects', { params, signal });
  }

  get(projectId: string, signal?: AbortSignal): Promise<ProjectEnvelope> {
    return this.client.get<ProjectEnvelope>(`/projects/${projectId}`, { signal });
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

  restore(projectId: string): Promise<ProjectEnvelope> {
    return this.client.post<ProjectEnvelope>(`/projects/${projectId}/restore`);
  }

  history(projectId: string, signal?: AbortSignal): Promise<ProjectHistoryResponse> {
    return this.client.get<ProjectHistoryResponse>(`/projects/${projectId}/history`, { signal });
  }

  remove(projectId: string): Promise<void> {
    return this.client.delete<void>(`/projects/${projectId}`);
  }
}
