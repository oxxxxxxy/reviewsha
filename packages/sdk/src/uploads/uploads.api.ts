import type { ApiClient } from '../client/api-client.js';

export interface UploadResponse {
  readonly id: string;
  readonly status: string;
  readonly version: number;
  readonly size: number;
  readonly checksum: string;
  readonly createdAt: string;
}
export interface UploadListResponse {
  readonly data: readonly UploadResponse[];
}

export class UploadsAPI {
  constructor(private readonly client: ApiClient) {}

  upload(
    projectId: string,
    file: globalThis.File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<UploadResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.client.http
      .post<UploadResponse>(`/projects/${projectId}/uploads`, form, {
        signal,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) =>
          onProgress?.(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
      })
      .then((response) => response.data);
  }

  list(projectId: string): Promise<UploadListResponse> {
    return this.client.get<UploadListResponse>(`/projects/${projectId}/uploads`);
  }
}
