import { describe, expect, it } from 'vitest';

import {
  AIProvider,
  type ApiErrorResponse,
  type ApiResponse,
  type PaginatedResponse,
  ProjectStatus,
  QueueStatus,
  ReportFormat,
  Role,
  ScanStatus,
} from '../../src/index.js';

describe('@reviewsha/types public API', () => {
  it('exports auth roles', () => {
    expect(Role.Admin).toBe('ADMIN');
  });

  it('exports project and scan enums', () => {
    expect(ProjectStatus.Active).toBe('ACTIVE');
    expect(ScanStatus.Completed).toBe('COMPLETED');
  });

  it('models API envelopes according to architecture contract', () => {
    const response: ApiResponse<{ id: string }> = { data: { id: '1' } };
    const paginated: PaginatedResponse<{ id: string }> = {
      data: [{ id: '1' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const error: ApiErrorResponse = {
      error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' },
    };

    expect(response.data.id).toBe('1');
    expect(paginated.data).toHaveLength(1);
    expect(error.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('exports queue/report/ai enums', () => {
    expect(QueueStatus.Active).toBe('ACTIVE');
    expect(ReportFormat.Json).toBe('json');
    expect(AIProvider.DeepSeek).toBe('deepseek');
  });
});
