import { Injectable } from '@nestjs/common';
import type { Prisma, Report } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type { IReportRepository } from './report.repository.interface';

@Injectable()
export class ReportRepository extends BaseRepository<Report> implements IReportRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<Report> {
    return client.report as unknown as BaseDelegate<Report>;
  }

  findByScan(scanId: string, options?: RepositoryOptions): Promise<Report | null> {
    return this.getClient(options).report.findUnique({ where: { scanId } });
  }

  create(data: Prisma.ReportCreateInput, options?: RepositoryOptions): Promise<Report> {
    return this.getClient(options).report.create({ data });
  }

  update(id: string, data: Prisma.ReportUpdateInput, options?: RepositoryOptions): Promise<Report> {
    return this.getClient(options).report.update({ where: { id }, data });
  }

  delete(id: string, options?: RepositoryOptions): Promise<Report> {
    return this.deleteById(id, options);
  }
}
