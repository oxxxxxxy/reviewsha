import type { ApiClient } from '../client/api-client.js';

export interface PipelineStatus {
  readonly id: string;
  readonly projectId: string;
  readonly uploadId: string;
  readonly currentStep: string | null;
  readonly status: string | null;
  readonly progress: number;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
}

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
