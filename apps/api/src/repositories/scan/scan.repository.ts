import { Injectable } from '@nestjs/common';
import type { PipelineStatus, Prisma, Scan, ScanStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';
import type { IScanRepository } from './scan.repository.interface';

@Injectable()
export class ScanRepository extends BaseRepository<Scan> implements IScanRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<Scan> {
    return client.scan as unknown as BaseDelegate<Scan>;
  }

  findByProject(projectId: string, options?: FindManyOptions): Promise<Scan[]> {
    return this.getClient(options).scan.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  countByProject(projectId: string, options?: RepositoryOptions): Promise<number> {
    return this.getClient(options).scan.count({ where: { projectId, deletedAt: null } });
  }

  findBySourceFile(sourceFileId: string, options?: RepositoryOptions): Promise<Scan | null> {
    return this.getClient(options).scan.findFirst({
      where: { sourceFileId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdForOwner(id: string, ownerId: string, options?: RepositoryOptions): Promise<Scan | null> {
    return this.getClient(options).scan.findFirst({
      where: { id, deletedAt: null, project: { ownerId } },
    });
  }

  create(data: Prisma.ScanCreateInput, options?: RepositoryOptions): Promise<Scan> {
    return this.getClient(options).scan.create({ data });
  }

  updateProgress(id: string, progress: number, options?: RepositoryOptions): Promise<Scan> {
    return this.getClient(options).scan.update({ where: { id }, data: { progress } });
  }

  updateStatus(id: string, status: ScanStatus, options?: RepositoryOptions): Promise<Scan> {
    return this.getClient(options).scan.update({ where: { id }, data: { status } });
  }

  finish(id: string, status: ScanStatus, options?: RepositoryOptions): Promise<Scan> {
    return this.getClient(options).scan.update({
      where: { id },
      data: { finishedAt: new Date(), progress: 100, status },
    });
  }

  update(id: string, data: Prisma.ScanUpdateInput, options?: RepositoryOptions): Promise<Scan> {
    return this.getClient(options).scan.update({ where: { id }, data });
  }

  countByPipelineStatus(status: PipelineStatus, options?: RepositoryOptions): Promise<number> {
    return this.getClient(options).scan.count({
      where: { pipelineStatus: status, deletedAt: null },
    });
  }
}
