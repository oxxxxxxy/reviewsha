import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';

export type ReportExportFormat = 'md' | 'json' | 'pdf';

export type ReportIssue = components['schemas']['ReportIssueDto'];
export type ReportDetail = components['schemas']['ReportResponseDto'];
export type ReportsListResponse = components['schemas']['ReportsListDto'];

export class ReportsAPI {
  constructor(private readonly client: ApiClient) {}

  list(
    projectId: string,
    page = 1,
    limit = 50,
    signal?: AbortSignal,
  ): Promise<ReportsListResponse> {
    return this.client.get<ReportsListResponse>(`/projects/${projectId}/reports`, {
      params: { page, limit },
      signal,
    });
  }

  get(reportId: string, signal?: AbortSignal): Promise<ReportDetail> {
    return this.client.get<ReportDetail>(`/reports/${reportId}`, { signal });
  }

  compare(
    oldReportId: string,
    newReportId: string,
  ): Promise<{
    oldReportId: string;
    newReportId: string;
    scoreDiff: number;
    newIssues: number;
    resolvedIssues: number;
    severityDiff: Record<string, number>;
  }> {
    return this.client.get(`/reports/compare`, {
      params: { oldReportId, newReportId },
    });
  }

  download(reportId: string, format: ReportExportFormat, signal?: AbortSignal): Promise<Blob> {
    return this.client.http
      .get(`/reports/${reportId}/export/${format}`, { responseType: 'blob', signal })
      .then((response) => response.data as Blob);
  }

  downloadPatchedZip(reportId: string, signal?: AbortSignal): Promise<Blob> {
    return this.client.http
      .get(`/reports/${reportId}/patched-zip`, { responseType: 'blob', signal })
      .then((response) => response.data as Blob);
  }
}
