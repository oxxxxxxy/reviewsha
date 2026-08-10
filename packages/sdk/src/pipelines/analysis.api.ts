import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';

export type Analysis = components['schemas']['AnalysisResponseDto'];
export type AnalysesResponse = components['schemas']['AnalysesListResponseDto'];

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
