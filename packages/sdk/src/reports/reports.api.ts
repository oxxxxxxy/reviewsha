import type { PaginatedResponse, Report } from '@reviewsha/types';
import type { ApiClient } from '../client/api-client.js';

export type ReportExportFormat = 'md' | 'json' | 'pdf';

export interface ReportIssue {
  readonly id: string;
  readonly severity: string;
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly filePath: string;
  readonly line: number | null;
  readonly recommendation: string | null;
}

export interface ReportDetail extends Report {
  readonly status: string;
  readonly issues: readonly ReportIssue[];
  readonly recommendations: readonly string[];
  readonly exports: readonly { format: string; size: number; createdAt: string }[];
}

export class ReportsAPI {
  constructor(private readonly client: ApiClient) {}

  list(
    projectId: string,
    page = 1,
    limit = 50,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<Report>> {
    return this.client.get<PaginatedResponse<Report>>(`/projects/${projectId}/reports`, {
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
}
