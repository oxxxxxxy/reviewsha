import { Inject, Injectable } from '@nestjs/common';
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
  constructor(@Inject(PrismaService) prisma: PrismaService) {
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

  async reviewProgress(
    scanId: string,
  ): Promise<{ total: number; completed: number; failed: number }> {
    // A BullMQ retry re-runs the analyze stage. Each stage execution records
    // an AI request, but those rows represent the same logical review task.
    // Counting every attempt made the UI show 0/2 -> 0/4 -> 0/6 while one
    // analysis job was retrying. Keep only the newest request for each task.
    const requests = await this.prisma.aIRequest.findMany({
      where: { scanId },
      select: { id: true, chunkId: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
    const latest = new Map<string, (typeof requests)[number]>();
    for (const request of requests) {
      latest.set(request.chunkId ?? request.id, request);
    }
    const values = [...latest.values()];
    return {
      total: values.length,
      completed: values.filter((request) => request.status === 'COMPLETED').length,
      failed: values.filter((request) => request.status === 'FAILED').length,
    };
  }

  async resetReviewRequests(scanId: string): Promise<void> {
    await this.prisma.aIRequest.deleteMany({ where: { scanId } });
    await this.prisma.aIUsage.deleteMany({ where: { scanId } });
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
