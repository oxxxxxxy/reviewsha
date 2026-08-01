import type { File } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export interface CreateArchiveUploadRequest {
  readonly fileName: string;
  readonly contentType: string;
  readonly size: number;
}

export interface CreateArchiveUploadResponse {
  readonly file: File;
  readonly uploadUrl: string;
}

export class UploadsAPI {
  constructor(private readonly client: ApiClient) {}

  createArchive(
    projectId: string,
    payload: CreateArchiveUploadRequest,
  ): Promise<CreateArchiveUploadResponse> {
    return this.client.post<CreateArchiveUploadResponse, CreateArchiveUploadRequest>(
      `/projects/${projectId}/files/archive`,
      payload,
    );
  }

  list(projectId: string): Promise<readonly File[]> {
    return this.client.get<readonly File[]>(`/projects/${projectId}/files`);
  }
}
