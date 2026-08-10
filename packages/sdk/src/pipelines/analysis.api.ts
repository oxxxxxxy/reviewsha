import type { ApiClient } from '../client/api-client.js';

export interface Analysis {
  readonly id: string;
  readonly projectId: string;
  readonly uploadId: string | null;
  readonly status: string;
  readonly pipelineStatus: string | null;
  readonly currentStep: string | null;
  readonly progress: number;
  readonly errorMessage: string | null;
  readonly createdAt: string;
  readonly finishedAt: string | null;
}

export interface AnalysesResponse {
  readonly data: readonly Analysis[];
  readonly meta: { page: number; limit: number; total: number; totalPages: number };
}

export class AnalysisAPI {
  constructor(private readonly client: ApiClient) {}

  list(projectId: string, page = 1, limit = 20, signal?: AbortSignal): Promise<AnalysesResponse> {
    return this.client.get<AnalysesResponse>(`/projects/${projectId}/analyses`, {
      params: { page, limit },
      signal,
    });
  }

  start(projectId: string, uploadId?: string): Promise<{ data: Analysis }> {
    return this.client.post<{ data: Analysis }>(`/projects/${projectId}/analyses`, undefined, {
      params: uploadId ? { uploadId } : undefined,
    });
  }
}
