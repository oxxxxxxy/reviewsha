import type { PaginatedResponse, Report } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export type ReportExportFormat = 'md' | 'json' | 'pdf';

export class ReportsAPI {
  constructor(private readonly client: ApiClient) {}

  list(projectId: string, page = 1, limit = 50): Promise<PaginatedResponse<Report>> {
    return this.client.get<PaginatedResponse<Report>>(`/projects/${projectId}/reports`, {
      params: { page, limit },
    });
  }

  get(reportId: string): Promise<Report> {
    return this.client.get<Report>(`/reports/${reportId}`);
  }

  download(reportId: string, format: ReportExportFormat): Promise<Blob> {
    return this.client.http
      .get(`/reports/${reportId}/export/${format}`, { responseType: 'blob' })
      .then((response) => response.data as Blob);
  }
}
