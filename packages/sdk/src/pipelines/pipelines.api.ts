import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';

export type PipelineStatus = components['schemas']['PipelineStatusDto'];

export interface PipelineResponse {
  readonly data: PipelineStatus;
}

export class PipelinesAPI {
  constructor(private readonly client: ApiClient) {}

  get(pipelineId: string): Promise<PipelineResponse> {
    return this.client.get<PipelineResponse>(`/pipelines/${pipelineId}`);
  }

  resume(pipelineId: string): Promise<PipelineResponse> {
    return this.client.post<PipelineResponse>(`/pipelines/${pipelineId}/resume`);
  }

  cancel(pipelineId: string): Promise<PipelineResponse> {
    return this.client.post<PipelineResponse>(`/pipelines/${pipelineId}/cancel`);
  }
}
