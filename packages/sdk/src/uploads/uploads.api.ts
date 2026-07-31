import type { File } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export interface CreateUploadRequest {
  readonly projectId: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly size: number;
}

export interface CreateUploadResponse {
  readonly file: File;
  readonly uploadUrl: string;
}

export class UploadsAPI {
  constructor(private readonly client: ApiClient) {}

  create(payload: CreateUploadRequest): Promise<CreateUploadResponse> {
    return this.client.post<CreateUploadResponse, CreateUploadRequest>('/files/uploads', payload);
  }

  get(fileId: string): Promise<File> {
    return this.client.get<File>(`/files/${fileId}`);
  }
}
