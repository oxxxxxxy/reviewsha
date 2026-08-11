import { Inject, Injectable } from '@nestjs/common';
import { Prisma, QueueJob, QueueStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';
import type { IQueueJobRepository } from './queue-job.repository.interface';

@Injectable()
export class QueueJobRepository extends BaseRepository<QueueJob> implements IQueueJobRepository {
  constructor(@Inject(PrismaService) prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<QueueJob> {
    return client.queueJob as unknown as BaseDelegate<QueueJob>;
  }

  create(data: Prisma.QueueJobCreateInput, options?: RepositoryOptions): Promise<QueueJob> {
    return this.getClient(options).queueJob.create({ data });
  }

  update(
    id: string,
    data: Prisma.QueueJobUpdateInput,
    options?: RepositoryOptions,
  ): Promise<QueueJob> {
    return this.getClient(options).queueJob.update({ where: { id }, data });
  }

  findWaiting(options?: FindManyOptions): Promise<QueueJob[]> {
    return this.findByStatus(QueueStatus.WAITING, options);
  }

  findRunning(options?: FindManyOptions): Promise<QueueJob[]> {
    return this.findByStatus(QueueStatus.ACTIVE, options);
  }

  findFailed(options?: FindManyOptions): Promise<QueueJob[]> {
    return this.findByStatus(QueueStatus.FAILED, options);
  }

  private findByStatus(status: QueueStatus, options?: FindManyOptions): Promise<QueueJob[]> {
    return this.getClient(options).queueJob.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      skip: options?.skip,
      take: options?.take,
    });
  }
}
