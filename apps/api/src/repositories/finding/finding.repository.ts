import { Injectable } from '@nestjs/common';
import type { Finding, Prisma, Severity } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';
import type { IFindingRepository } from './finding.repository.interface';

@Injectable()
export class FindingRepository implements IFindingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(options?: RepositoryOptions) {
    return options?.tx ?? this.prisma;
  }

  findByReport(reportId: string, options?: FindManyOptions): Promise<Finding[]> {
    return this.getClient(options).finding.findMany({
      where: { reportId },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      skip: options?.skip,
      take: options?.take,
    });
  }

  findBySeverity(severity: Severity, options?: FindManyOptions): Promise<Finding[]> {
    return this.getClient(options).finding.findMany({
      where: { severity },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  createMany(
    data: Prisma.FindingCreateManyInput[],
    options?: RepositoryOptions,
  ): Promise<Prisma.BatchPayload> {
    return this.getClient(options).finding.createMany({ data, skipDuplicates: true });
  }

  deleteByReport(reportId: string, options?: RepositoryOptions): Promise<Prisma.BatchPayload> {
    return this.getClient(options).finding.deleteMany({ where: { reportId } });
  }
}
