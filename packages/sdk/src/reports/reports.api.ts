import type { PaginatedResponse, Report, ReportFormat } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export interface ExportReportRequest {
  readonly format: ReportFormat;
}

export class ReportsAPI {
  constructor(private readonly client: ApiClient) {}

  list(projectId: string): Promise<PaginatedResponse<Report>> {
    return this.client.get<PaginatedResponse<Report>>(`/projects/${projectId}/reports`);
  }

  get(reportId: string): Promise<Report> {
    return this.client.get<Report>(`/reports/${reportId}`);
  }

  export(reportId: string, payload: ExportReportRequest): Promise<{ readonly url: string }> {
    return this.client.post<{ readonly url: string }, ExportReportRequest>(
      `/reports/${reportId}/export`,
      payload,
    );
  }
}
