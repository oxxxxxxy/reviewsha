import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';

export type UploadResponse = components['schemas']['UploadResponseDto'];
export type UploadListResponse = components['schemas']['UploadListResponseDto'];

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
        // Override the SDK JSON default; the browser adds the multipart boundary.
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) =>
          onProgress?.(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
      })
      .then((response) => response.data);
  }

  list(projectId: string, signal?: AbortSignal): Promise<UploadListResponse> {
    return this.client.get<UploadListResponse>(`/projects/${projectId}/uploads`, { signal });
  }

  remove(projectId: string, uploadId: string): Promise<void> {
    return this.client.http
      .delete(`/projects/${projectId}/uploads/${uploadId}`)
      .then(() => undefined);
  }

  importGithub(projectId: string, url: string, branch?: string): Promise<UploadListResponse> {
    return this.client.post<UploadListResponse>(`/projects/${projectId}/uploads/github`, {
      url,
      ...(branch ? { branch } : {}),
    });
  }
}
