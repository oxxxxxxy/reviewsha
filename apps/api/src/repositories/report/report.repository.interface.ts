import type { Prisma, Report } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';

export interface IReportRepository extends IRepository<Report> {
  findByScan(scanId: string, options?: RepositoryOptions): Promise<Report | null>;
  create(data: Prisma.ReportCreateInput, options?: RepositoryOptions): Promise<Report>;
  update(id: string, data: Prisma.ReportUpdateInput, options?: RepositoryOptions): Promise<Report>;
  delete(id: string, options?: RepositoryOptions): Promise<Report>;
}
