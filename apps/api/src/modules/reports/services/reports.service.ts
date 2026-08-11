import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReportFormat, Role } from '@prisma/client';
import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ProjectRepository } from '../../../repositories/project/project.repository';
import { StorageService } from '../../storage/services/storage.service';
import type { ReportResponseDto, ReportsListDto } from '../dto/report-response.dto';
import { ReportsRepository, type DetailedReport } from '../repositories/reports.repository';

type ExportFormat = 'json' | 'md' | 'pdf';

@Injectable()
export class ReportsService {
  private readonly reports: ReportsRepository;
  private readonly projects: ProjectRepository;
  private readonly storage: StorageService;

  constructor(
    @Inject(ReportsRepository) reports: ReportsRepository,
    @Inject(ProjectRepository) projects: ProjectRepository,
    @Inject(StorageService) storage: StorageService,
  ) {
    this.reports = reports;
    this.projects = projects;
    this.storage = storage;
  }

  async findById(user: AuthenticatedUser, id: string): Promise<ReportResponseDto> {
    const report = await this.getOwned(user, id);
    return this.toResponse(report);
  }

  async findByProject(
    user: AuthenticatedUser,
    projectId: string,
    page = 1,
    limit = 50,
  ): Promise<ReportsListDto> {
    await this.assertProject(user, projectId);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [reports, total] = await Promise.all([
      this.reports.findByProject(projectId, (safePage - 1) * safeLimit, safeLimit),
      this.reports.countByProject(projectId),
    ]);
    return {
      data: reports.map((report) => this.toResponse(report)),
      meta: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
    };
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const report = await this.getOwned(user, id);
    await Promise.all(
      report.exports.map((item) =>
        this.storage.delete(item.bucket as 'reports', item.objectKey).catch(() => undefined),
      ),
    );
    await this.reports.softDelete(report.id);
  }

  async export(user: AuthenticatedUser, id: string, format: ExportFormat) {
    const report = await this.getOwned(user, id);
    const generated = await this.buildExport(report, format);
    const checksum = `sha256:${createHash('sha256').update(generated.body).digest('hex')}`;
    const objectKey = `reports/${report.id}/${report.id}.${format}`;
    await this.storage.upload({
      bucket: 'reports',
      key: objectKey,
      body: generated.body,
      size: generated.body.length,
      metadata: {
        contentType: generated.contentType,
        checksum,
        projectId: report.projectId,
        reportId: report.id,
      },
    });
    await this.reports.saveExport({
      reportId: report.id,
      format: this.reportFormat(format),
      bucket: 'reports',
      objectKey,
      mimeType: generated.contentType,
      size: generated.body.length,
      checksum,
    });
    return { ...generated, filename: `report-${id}.${format}` };
  }

  async compare(user: AuthenticatedUser, oldId: string, newId: string) {
    const [oldReport, newReport] = await Promise.all([
      this.getOwned(user, oldId),
      this.getOwned(user, newId),
    ]);
    if (oldReport.projectId !== newReport.projectId) {
      throw new BadRequestException('Reports must belong to the same project');
    }
    const oldIssues = new Map(oldReport.findings.map((item) => [this.fingerprint(item), item]));
    const newIssues = new Map(newReport.findings.map((item) => [this.fingerprint(item), item]));
    const added = [...newIssues].filter(([key]) => !oldIssues.has(key)).map(([, item]) => item);
    const resolved = [...oldIssues].filter(([key]) => !newIssues.has(key)).map(([, item]) => item);
    return {
      oldReportId: oldId,
      newReportId: newId,
      scoreDiff: (newReport.score ?? 0) - (oldReport.score ?? 0),
      newIssues: added.length,
      resolvedIssues: resolved.length,
      severityDiff: this.severityCounts(newReport.findings, oldReport.findings),
      recommendationsAdded: [
        ...new Set(added.flatMap((item) => (item.recommendation ? [item.recommendation] : []))),
      ],
      added: added.map((item) => ({ id: item.id, severity: item.severity, title: item.title })),
      resolved: resolved.map((item) => ({
        id: item.id,
        severity: item.severity,
        title: item.title,
      })),
    };
  }

  private async getOwned(user: AuthenticatedUser, id: string): Promise<DetailedReport> {
    const report = await this.reports.findById(id);
    if (!report) throw new NotFoundException('Report not found');
    await this.assertProject(user, report.projectId);
    return report;
  }

  private async assertProject(user: AuthenticatedUser, projectId: string): Promise<void> {
    const project = await this.projects.findByIdForOwnerIncludingDeleted(
      projectId,
      user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN ? undefined : user.id,
    );
    if (!project) throw new ForbiddenException('You cannot access this project');
  }

  private toResponse(report: DetailedReport): ReportResponseDto {
    return {
      id: report.id,
      scanId: report.scanId,
      projectId: report.projectId,
      status: report.status,
      score: report.score,
      summary: report.summary,
      format: report.format,
      tokensUsed: report.tokensUsed,
      createdAt: report.createdAt,
      issues: report.findings.map((item) => ({
        id: item.id,
        severity: item.severity,
        category: item.category,
        title: item.title,
        description: item.description,
        filePath: item.filePath,
        line: item.line,
        recommendation: item.recommendation,
      })),
      recommendations: [
        ...new Set(
          report.findings.flatMap((item) => (item.recommendation ? [item.recommendation] : [])),
        ),
      ],
      exports: report.exports.map((item) => ({
        format: item.format,
        size: Number(item.size),
        createdAt: item.createdAt,
      })),
      files: this.fileCoverage(report),
    };
  }

  private fileCoverage(report: DetailedReport) {
    const chunks = report.scan.analysisContext?.chunks;
    const paths = new Set<string>();
    if (Array.isArray(chunks)) {
      for (const chunk of chunks as Array<{ filePaths?: unknown; path?: unknown }>) {
        for (const path of Array.isArray(chunk.filePaths) ? chunk.filePaths : []) {
          if (typeof path === 'string') paths.add(path);
        }
        if (typeof chunk.path === 'string' && !chunk.path.startsWith('project://'))
          paths.add(chunk.path);
      }
    }
    const issues = new Map<string, number>();
    for (const finding of report.findings) {
      issues.set(finding.filePath, (issues.get(finding.filePath) ?? 0) + 1);
      paths.add(finding.filePath);
    }
    const generated = Array.isArray(report.fileReviews)
      ? (report.fileReviews as Array<{
          path?: unknown;
          summary?: unknown;
          strengths?: unknown;
          weaknesses?: unknown;
        }>)
      : [];
    const generatedByPath = new Map(
      generated
        .filter((item) => typeof item.path === 'string')
        .map((item) => [item.path as string, item]),
    );
    return [...paths].sort().map((path) => {
      const review = generatedByPath.get(path);
      return {
        path,
        issueCount: issues.get(path) ?? 0,
        status: issues.has(path) ? ('ISSUES_FOUND' as const) : ('REVIEWED' as const),
        summary:
          typeof review?.summary === 'string'
            ? review.summary
            : 'File was included in the project review.',
        strengths: Array.isArray(review?.strengths)
          ? review.strengths.filter((item): item is string => typeof item === 'string')
          : [],
        weaknesses: Array.isArray(review?.weaknesses)
          ? review.weaknesses.filter((item): item is string => typeof item === 'string')
          : [],
      };
    });
  }

  private async buildExport(report: DetailedReport, format: ExportFormat) {
    if (format === 'pdf') {
      return { body: await this.pdf(report), contentType: 'application/pdf' };
    }
    if (format === 'json') {
      return {
        body: Buffer.from(
          JSON.stringify({ version: '1.0', report: this.toResponse(report) }, null, 2),
        ),
        contentType: 'application/json',
      };
    }
    const issues = report.findings.length
      ? report.findings
          .map(
            (item, index) =>
              `${index + 1}. **${item.severity}** \`${item.filePath}\`${item.line ? `:${item.line}` : ''} — ${item.title}\n   - ${item.description}\n   - Recommendation: ${item.recommendation ?? 'None'}`,
          )
          .join('\n')
      : 'No issues found.';
    return {
      body: Buffer.from(
        `# Reviewsha Report\n\n## Score\n\n${report.score ?? 'N/A'}/100\n\n## Summary\n\n${report.summary ?? 'Report is still generating.'}\n\n## Issues\n\n${issues}\n`,
      ),
      contentType: 'text/markdown',
    };
  }

  private pdf(report: DetailedReport): Promise<Buffer> {
    const document = new PDFDocument({ autoFirstPage: true, margin: 50 });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
    });
    document.fontSize(24).text('Reviewsha Code Review Report').moveDown();
    document
      .fontSize(16)
      .text(`Score: ${report.score ?? 'N/A'}/100`)
      .moveDown();
    document
      .fontSize(14)
      .text('Summary')
      .fontSize(11)
      .text(report.summary ?? 'Not available.')
      .moveDown();
    document.fontSize(14).text('Issues').moveDown(0.5);
    if (!report.findings.length) document.fontSize(11).text('No issues found.');
    for (const [index, issue] of report.findings.entries()) {
      document
        .fontSize(11)
        .text(`${index + 1}. [${issue.severity}] ${issue.title}`, { continued: false })
        .fontSize(9)
        .text(`${issue.filePath}${issue.line ? `:${issue.line}` : ''}`)
        .text(issue.description)
        .text(`Recommendation: ${issue.recommendation ?? 'None'}`)
        .moveDown();
    }
    document.end();
    return finished;
  }

  private reportFormat(format: ExportFormat): ReportFormat {
    return { md: ReportFormat.MD, json: ReportFormat.JSON, pdf: ReportFormat.PDF }[format];
  }

  private fingerprint(issue: { filePath: string; category: string; title: string }): string {
    return `${issue.filePath.toLowerCase()}|${issue.category}|${issue.title.toLowerCase()}`;
  }

  private severityCounts(
    current: Array<{ severity: string }>,
    previous: Array<{ severity: string }>,
  ): Record<string, number> {
    const values = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    return Object.fromEntries(
      values.map((severity) => [
        severity,
        current.filter((item) => item.severity === severity).length -
          previous.filter((item) => item.severity === severity).length,
      ]),
    );
  }
}
