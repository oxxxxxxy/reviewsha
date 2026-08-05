import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, type Report } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ProjectRepository } from '../../../repositories/project/project.repository';
import { ReportRepository } from '../../../repositories/report/report.repository';
import type { ReportResponseDto, ReportsListDto } from '../dto/report-response.dto';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly projects: ProjectRepository,
  ) {}

  async findById(user: AuthenticatedUser, id: string): Promise<ReportResponseDto> {
    const report =
      user.role === Role.ADMIN ? await this.reports.findById(id) : await this.reports.findById(id);
    if (!report || report.deletedAt) throw new NotFoundException('Report not found');
    const project = await this.projects.findByIdForOwnerIncludingDeleted(
      report.projectId,
      user.role === Role.ADMIN ? undefined : user.id,
    );
    if (!project) throw new ForbiddenException('You cannot access this report');
    return this.toResponse(report);
  }

  async findByProject(user: AuthenticatedUser, projectId: string): Promise<ReportsListDto> {
    const project = await this.projects.findByIdForOwnerIncludingDeleted(
      projectId,
      user.role === Role.ADMIN ? undefined : user.id,
    );
    if (!project) throw new ForbiddenException('You cannot access this project');
    return {
      data: (await this.reports.findByProject(projectId)).map((report) => this.toResponse(report)),
    };
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const report = await this.findById(user, id);
    await this.reports.delete(report.id);
  }

  async export(user: AuthenticatedUser, id: string, format: 'json' | 'md' | 'pdf') {
    const report = await this.findById(user, id);
    if (format === 'pdf') {
      const document = new PDFDocument();
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      const finished = new Promise<Buffer>((resolve) =>
        document.on('end', () => resolve(Buffer.concat(chunks))),
      );
      document.fontSize(22).text('Reviewsha Report').moveDown();
      document
        .fontSize(16)
        .text(`Score: ${report.score ?? 'N/A'}/100`)
        .moveDown();
      document.fontSize(12).text(report.summary ?? 'Report is still generating.');
      document.end();
      return { body: await finished, contentType: 'application/pdf', filename: `report-${id}.pdf` };
    }
    const body =
      format === 'json'
        ? JSON.stringify({ version: '1.0', report }, null, 2)
        : `# Reviewsha Report\n\n## Score\n\n${report.score ?? 'N/A'}/100\n\n## Summary\n\n${report.summary ?? 'Report is still generating.'}\n`;
    return {
      body,
      contentType: format === 'json' ? 'application/json' : 'text/markdown',
      filename: `report-${id}.${format}`,
    };
  }

  async compare(user: AuthenticatedUser, oldId: string, newId: string) {
    const [oldReport, newReport] = await Promise.all([
      this.findById(user, oldId),
      this.findById(user, newId),
    ]);
    return {
      oldReportId: oldId,
      newReportId: newId,
      scoreDiff: (newReport.score ?? 0) - (oldReport.score ?? 0),
      summaryChanged: oldReport.summary !== newReport.summary,
    };
  }

  private toResponse(report: Report): ReportResponseDto {
    return { ...report, status: report.summary ? 'READY' : 'GENERATING' };
  }
}
