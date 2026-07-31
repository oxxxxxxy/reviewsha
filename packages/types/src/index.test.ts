import { describe, expect, it } from 'vitest';

import { AIProvider, ProjectStatus, QueueStatus, ReportFormat, Role, ScanStatus } from './index.js';

describe('@reviewsha/types public API', () => {
  it('exports auth roles', () => {
    expect(Role.Admin).toBe('ADMIN');
  });

  it('exports project and scan enums', () => {
    expect(ProjectStatus.Active).toBe('ACTIVE');
    expect(ScanStatus.Completed).toBe('COMPLETED');
  });

  it('exports queue/report/ai enums', () => {
    expect(QueueStatus.Active).toBe('ACTIVE');
    expect(ReportFormat.Json).toBe('json');
    expect(AIProvider.DeepSeek).toBe('deepseek');
  });
});
