/**
 * Public entry point for the Reviewsha SDK package.
 *
 * Frontend applications should import API services from this module instead of
 * constructing HTTP requests directly.
 */
export * from './admin/admin.api.js';
export * from './pipelines/analysis.api.js';
export * from './auth/auth.api.js';
export * from './chat/chat.api.js';
export * from './client/api-client.js';
export * from './interceptors/auth.interceptor.js';
export * from './projects/projects.api.js';
export * from './pipelines/pipelines.api.js';
export * from './reports/reports.api.js';
export * from './uploads/uploads.api.js';
export type { components, operations, paths } from './generated/openapi.js';

import { AdminAPI } from './admin/admin.api.js';
import { AnalysisAPI } from './pipelines/analysis.api.js';
import { AuthAPI } from './auth/auth.api.js';
import { ChatAPI } from './chat/chat.api.js';
import { ApiClient, type ApiClientOptions } from './client/api-client.js';
import { ProjectsAPI } from './projects/projects.api.js';
import { PipelinesAPI } from './pipelines/pipelines.api.js';
import { ReportsAPI } from './reports/reports.api.js';
import { UploadsAPI } from './uploads/uploads.api.js';

export function createReviewshaSDK(options?: ApiClientOptions) {
  const client = new ApiClient(options);

  return {
    client,
    auth: new AuthAPI(client),
    projects: new ProjectsAPI(client),
    pipelines: new PipelinesAPI(client),
    analyses: new AnalysisAPI(client),
    uploads: new UploadsAPI(client),
    reports: new ReportsAPI(client),
    chat: new ChatAPI(client),
    admin: new AdminAPI(client),
  } as const;
}

export type ReviewshaSDK = ReturnType<typeof createReviewshaSDK>;
