import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ReportFormat, Role } from '@prisma/client';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import PDFDocument from 'pdfkit';
import { fromBuffer } from 'yauzl';
import { ZipFile } from 'yazl';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ProjectRepository } from '../../../repositories/project/project.repository';
import { StorageService } from '../../storage/services/storage.service';
import type { ReportResponseDto, ReportsListDto } from '../dto/report-response.dto';
import { ReportsRepository, type DetailedReport } from '../repositories/reports.repository';
import { UploadedFileRepository } from '../../../repositories/upload/uploaded-file.repository';

type ExportFormat = 'json' | 'md' | 'pdf';
export type ArchivePatch = { filePath: string; before: string; after: string };

@Injectable()
export class ReportsService {
  private readonly reports: ReportsRepository;
  private readonly projects: ProjectRepository;
  private readonly storage: StorageService;
  private readonly uploads: UploadedFileRepository;

  constructor(
    @Inject(ReportsRepository) reports: ReportsRepository,
    @Inject(ProjectRepository) projects: ProjectRepository,
    @Inject(StorageService) storage: StorageService,
    @Optional() @Inject(UploadedFileRepository) uploads?: UploadedFileRepository,
  ) {
    this.reports = reports;
    this.projects = projects;
    this.storage = storage;
    this.uploads = uploads as UploadedFileRepository;
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

  async exportPatchedZip(user: AuthenticatedUser, id: string): Promise<Buffer> {
    const report = await this.getOwned(user, id);
    if (!report.scan.sourceFileId) throw new NotFoundException('Source project archive not found');
    if (!this.uploads) throw new NotFoundException('Source project archive repository unavailable');
    const upload = await this.uploads.findById(report.scan.sourceFileId);
    if (!upload) throw new NotFoundException('Source project archive not found');
    const patches = new Map(
      report.findings
        .map((finding) => [finding.filePath, this.suggestedPatch(finding.suggestedPatch)] as const)
        .filter((item): item is [string, NonNullable<(typeof item)[1]>] => Boolean(item[1])),
    );
    return this.rewriteProjectZip(report.projectId, patches);
  }

  async exportPatchedZipForProject(
    user: AuthenticatedUser,
    projectId: string,
    patches: ArchivePatch[],
  ): Promise<Buffer> {
    await this.assertProject(user, projectId);
    const [latest] = await this.reports.findByProject(projectId, 0, 1);
    if (!latest) throw new NotFoundException('Project report not found');
    return this.rewriteProjectZip(
      projectId,
      new Map(patches.map((patch) => [patch.filePath, patch] as const)),
    );
  }

  private async rewriteProjectZip(
    projectId: string,
    patches: Map<string, ArchivePatch | { before: string; after: string }>,
  ): Promise<Buffer> {
    const [latest] = await this.reports.findByProject(projectId, 0, 1);
    if (!latest?.scan.sourceFileId) throw new NotFoundException('Source project archive not found');
    if (!this.uploads) throw new NotFoundException('Source project archive repository unavailable');
    const upload = await this.uploads.findById(latest.scan.sourceFileId);
    if (!upload) throw new NotFoundException('Source project archive not found');
    const source = await this.storage.download('projects', upload.objectKey);
    return this.rewriteZip(await this.readStream(source.body), patches);
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
        // Older findings stored a shortened copy of the problem in `title`.
        // Prefer the full description only when it is clearly that truncated
        // title, so existing reports are rendered without losing text while
        // intentionally concise titles remain unchanged.
        title:
          item.description && item.description.startsWith(item.title)
            ? item.description
            : item.title,
        description: item.description,
        filePath: item.filePath,
        line: item.line,
        recommendation: item.recommendation,
        suggestedPatch: this.suggestedPatch(item.suggestedPatch),
        codeContext: this.codeContext(report, item.filePath, item.line),
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

  private codeContext(report: DetailedReport, filePath: string, line?: number | null) {
    if (!line || line <= 1) return null;
    const chunks = report.scan.analysisContext?.chunks;
    if (!Array.isArray(chunks)) return null;
    for (const chunk of chunks as Array<{
      path?: unknown;
      filePaths?: unknown;
      content?: unknown;
    }>) {
      const paths = [
        ...(typeof chunk.path === 'string' ? [chunk.path] : []),
        ...(Array.isArray(chunk.filePaths)
          ? chunk.filePaths.filter((value): value is string => typeof value === 'string')
          : []),
      ];
      if (!paths.includes(filePath) || typeof chunk.content !== 'string') continue;
      const sourceLines = chunk.content.split(/\r?\n/);
      if (line > sourceLines.length) continue;
      const startLine = Math.max(1, line - 2);
      const endLine = Math.min(sourceLines.length, line + 2);
      return {
        startLine,
        endLine,
        lines: sourceLines.slice(startLine - 1, endLine).map((content, index) => {
          const currentLine = startLine + index;
          return { line: currentLine, content, isTarget: currentLine === line };
        }),
      };
    }
    return null;
  }

  private suggestedPatch(value: unknown) {
    if (!value || typeof value !== 'object') return null;
    const patch = value as Record<string, unknown>;
    if (typeof patch.before !== 'string' || typeof patch.after !== 'string') return null;
    return {
      before: patch.before,
      after: patch.after,
      ...(typeof patch.startLine === 'number' ? { startLine: patch.startLine } : {}),
      ...(typeof patch.endLine === 'number' ? { endLine: patch.endLine } : {}),
    };
  }

  private async readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | string>)
      chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  private rewriteZip(
    source: Buffer,
    patches: Map<string, { before: string; after: string }>,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fromBuffer(source, { lazyEntries: true }, (error, zip) => {
        if (error || !zip) return reject(error ?? new Error('Invalid project archive'));
        const output = new ZipFile();
        const chunks: Buffer[] = [];
        output.outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        output.outputStream.on('error', reject);
        output.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
        zip.readEntry();
        zip.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            output.addEmptyDirectory(entry.fileName);
            zip.readEntry();
            return;
          }
          zip.openReadStream(entry, (readError, stream) => {
            if (readError || !stream)
              return reject(readError ?? new Error('Unable to read archive entry'));
            const parts: Buffer[] = [];
            stream.on('data', (chunk: Buffer) => parts.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => {
              let content = Buffer.concat(parts);
              const patch =
                patches.get(entry.fileName) ?? patches.get(entry.fileName.replace(/^[^/]+\//, ''));
              if (patch) {
                const text = content.toString('utf8');
                if (text.includes(patch.before))
                  content = Buffer.from(text.replace(patch.before, patch.after));
              }
              output.addBuffer(content, entry.fileName);
              zip.readEntry();
            });
          });
        });
        zip.on('end', () => output.end());
        zip.on('error', reject);
      });
    });
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
    // PDFKit's built-in fonts are WinAnsi-only and turn Cyrillic into mojibake.
    // Use an embedded Unicode font in the container and keep a portable fallback
    // for environments where the system font package is not installed yet.
    const unicodeFont = [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ].find((path) => existsSync(path));
    if (unicodeFont) document.font(unicodeFont);
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
