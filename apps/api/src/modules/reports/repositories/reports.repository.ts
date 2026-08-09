import { Injectable } from '@nestjs/common';
import type { Prisma, ReportExport, ReportFormat } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const reportInclude = {
  findings: { orderBy: [{ severity: 'desc' as const }, { createdAt: 'asc' as const }] },
  exports: { orderBy: { createdAt: 'desc' as const } },
  scan: { select: { status: true, createdAt: true, finishedAt: true } },
} satisfies Prisma.ReportInclude;

export type DetailedReport = Prisma.ReportGetPayload<{ include: typeof reportInclude }>;

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<DetailedReport | null> {
    return this.prisma.report.findFirst({ where: { id, deletedAt: null }, include: reportInclude });
  }

  findByProject(projectId: string, skip = 0, take = 50): Promise<DetailedReport[]> {
    return this.prisma.report.findMany({
      where: { projectId, deletedAt: null },
      include: reportInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countByProject(projectId: string): Promise<number> {
    return this.prisma.report.count({ where: { projectId, deletedAt: null } });
  }

  saveExport(data: {
    reportId: string;
    format: ReportFormat;
    bucket: string;
    objectKey: string;
    mimeType: string;
    size: number;
    checksum: string;
  }): Promise<ReportExport> {
    return this.prisma.reportExport.upsert({
      where: { reportId_format: { reportId: data.reportId, format: data.format } },
      create: data,
      update: {
        bucket: data.bucket,
        objectKey: data.objectKey,
        mimeType: data.mimeType,
        size: data.size,
        checksum: data.checksum,
        createdAt: new Date(),
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.reportExport.deleteMany({ where: { reportId: id } }),
      this.prisma.report.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
  }
}
