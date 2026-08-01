import type { Finding, Prisma, Severity } from '@prisma/client';
import type { RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';

export interface IFindingRepository {
  findByReport(reportId: string, options?: FindManyOptions): Promise<Finding[]>;
  findBySeverity(severity: Severity, options?: FindManyOptions): Promise<Finding[]>;
  createMany(
    data: Prisma.FindingCreateManyInput[],
    options?: RepositoryOptions,
  ): Promise<Prisma.BatchPayload>;
  deleteByReport(reportId: string, options?: RepositoryOptions): Promise<Prisma.BatchPayload>;
}
