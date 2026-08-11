import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FindingCategory, ReportFormat, ReportStatus, Role, Severity } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsService } from '../../../../src/modules/reports/services/reports.service';

const user = { id: 'user-1', email: 'user@example.com', role: Role.USER };
const finding = (overrides: Record<string, unknown> = {}) => ({
  id: 'finding-1',
  scanId: 'scan-1',
  reportId: 'report-1',
  fileId: null,
  filePath: 'src/auth.ts',
  line: 10,
  column: null,
  lineStart: 10,
  lineEnd: 10,
  severity: Severity.HIGH,
  category: FindingCategory.SECURITY,
  status: 'OPEN',
  title: 'Unsafe token validation',
  description: 'Token is accepted without complete validation.',
  recommendation: 'Validate issuer and audience.',
  createdAt: new Date('2026-08-08T00:00:00Z'),
  ...overrides,
});
const report = (overrides: Record<string, unknown> = {}) => ({
  id: 'report-1',
  scanId: 'scan-1',
  projectId: 'project-1',
  summary: 'Review summary',
  score: 80,
  filePath: null,
  format: ReportFormat.MD,
  status: ReportStatus.READY,
  tokensUsed: 120,
  cost: 0,
  createdAt: new Date('2026-08-08T00:00:00Z'),
  deletedAt: null,
  findings: [finding()],
  exports: [],
  scan: { status: 'COMPLETED', createdAt: new Date(), finishedAt: new Date() },
  ...overrides,
});

describe('ReportsService', () => {
  let repository: {
    findById: ReturnType<typeof vi.fn>;
    findByProject: ReturnType<typeof vi.fn>;
    countByProject: ReturnType<typeof vi.fn>;
    saveExport: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let projects: { findByIdForOwnerIncludingDeleted: ReturnType<typeof vi.fn> };
  let storage: { upload: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let service: ReportsService;

  beforeEach(() => {
    repository = {
      findById: vi.fn().mockResolvedValue(report()),
      findByProject: vi.fn().mockResolvedValue([report()]),
      countByProject: vi.fn().mockResolvedValue(1),
      saveExport: vi.fn().mockResolvedValue({}),
      softDelete: vi.fn().mockResolvedValue(undefined),
    };
    projects = { findByIdForOwnerIncludingDeleted: vi.fn().mockResolvedValue({ id: 'project-1' }) };
    storage = {
      upload: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    service = new ReportsService(repository as never, projects as never, storage as never);
  });

  it('returns a complete owned report', async () => {
    await expect(service.findById(user, 'report-1')).resolves.toMatchObject({
      status: ReportStatus.READY,
      issues: [{ title: 'Unsafe token validation' }],
      recommendations: ['Validate issuer and audience.'],
    });
  });

  it('uses the full description when an old finding title was truncated from it', async () => {
    const fullProblem =
      'Нет обработки случая, когда устройство мыши недоступно или отключено во время работы программы. Это приведёт к падению приложения.';
    repository.findById.mockResolvedValue(
      report({
        findings: [
          finding({
            title: fullProblem.slice(0, 120),
            description: fullProblem,
          }),
        ],
      }),
    );

    await expect(service.findById(user, 'report-1')).resolves.toMatchObject({
      issues: [{ title: fullProblem }],
    });
  });

  it('returns not found for a missing report', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findById(user, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids access to an unowned project', async () => {
    projects.findByIdForOwnerIncludingDeleted.mockResolvedValue(null);
    await expect(service.findById(user, 'report-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([Role.ADMIN, Role.SUPER_ADMIN])('allows %s to resolve any project', async (role) => {
    await service.findById({ ...user, role }, 'report-1');
    expect(projects.findByIdForOwnerIncludingDeleted).toHaveBeenCalledWith('project-1', undefined);
  });

  it('paginates project history', async () => {
    await expect(service.findByProject(user, 'project-1', 2, 10)).resolves.toMatchObject({
      meta: { page: 2, limit: 10, total: 1, totalPages: 1 },
    });
    expect(repository.findByProject).toHaveBeenCalledWith('project-1', 10, 10);
  });

  it('bounds history page size', async () => {
    await service.findByProject(user, 'project-1', -1, 500);
    expect(repository.findByProject).toHaveBeenCalledWith('project-1', 0, 100);
  });

  it.each([
    ['md', 'text/markdown', ReportFormat.MD],
    ['json', 'application/json', ReportFormat.JSON],
    ['pdf', 'application/pdf', ReportFormat.PDF],
  ] as const)('generates and persists %s export', async (format, mimeType, persistedFormat) => {
    const exported = await service.export(user, 'report-1', format);
    expect(exported.contentType).toBe(mimeType);
    expect(Buffer.isBuffer(exported.body)).toBe(true);
    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'reports', size: exported.body.length }),
    );
    expect(repository.saveExport).toHaveBeenCalledWith(
      expect.objectContaining({ format: persistedFormat, mimeType }),
    );
  });

  it('includes findings and recommendations in Markdown', async () => {
    const exported = await service.export(user, 'report-1', 'md');
    expect(exported.body.toString()).toContain('Unsafe token validation');
    expect(exported.body.toString()).toContain('Validate issuer and audience');
  });

  it('produces valid versioned JSON', async () => {
    const exported = await service.export(user, 'report-1', 'json');
    expect(JSON.parse(exported.body.toString())).toMatchObject({
      version: '1.0',
      report: { id: 'report-1' },
    });
  });

  it('produces a non-empty PDF', async () => {
    const exported = await service.export(user, 'report-1', 'pdf');
    expect(exported.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('deletes stored exports before soft-deleting report', async () => {
    repository.findById.mockResolvedValue(
      report({
        exports: [
          {
            format: ReportFormat.PDF,
            bucket: 'reports',
            objectKey: 'reports/r.pdf',
            size: 5n,
            createdAt: new Date(),
          },
        ],
      }),
    );
    await service.remove(user, 'report-1');
    expect(storage.delete).toHaveBeenCalledWith('reports', 'reports/r.pdf');
    expect(repository.softDelete).toHaveBeenCalledWith('report-1');
  });

  it('soft-deletes even if an old storage object is already missing', async () => {
    repository.findById.mockResolvedValue(
      report({ exports: [{ bucket: 'reports', objectKey: 'missing', format: ReportFormat.MD }] }),
    );
    storage.delete.mockRejectedValue(new Error('missing'));
    await expect(service.remove(user, 'report-1')).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalled();
  });

  it('compares added and resolved issues', async () => {
    repository.findById
      .mockResolvedValueOnce(report({ score: 70, findings: [finding()] }))
      .mockResolvedValueOnce(
        report({
          id: 'report-2',
          score: 90,
          findings: [finding({ id: 'finding-2', title: 'New issue', severity: Severity.LOW })],
        }),
      );
    await expect(service.compare(user, 'report-1', 'report-2')).resolves.toMatchObject({
      scoreDiff: 20,
      newIssues: 1,
      resolvedIssues: 1,
      severityDiff: { HIGH: -1, LOW: 1 },
    });
  });

  it('does not treat identical findings as changed', async () => {
    repository.findById
      .mockResolvedValueOnce(report())
      .mockResolvedValueOnce(report({ id: 'report-2' }));
    await expect(service.compare(user, 'report-1', 'report-2')).resolves.toMatchObject({
      newIssues: 0,
      resolvedIssues: 0,
    });
  });

  it('rejects comparison across projects', async () => {
    repository.findById
      .mockResolvedValueOnce(report())
      .mockResolvedValueOnce(report({ id: 'report-2', projectId: 'project-2' }));
    await expect(service.compare(user, 'report-1', 'report-2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deduplicates recommendations in response', async () => {
    repository.findById.mockResolvedValue(
      report({ findings: [finding(), finding({ id: 'finding-2' })] }),
    );
    const response = await service.findById(user, 'report-1');
    expect(response.recommendations).toEqual(['Validate issuer and audience.']);
  });
});
