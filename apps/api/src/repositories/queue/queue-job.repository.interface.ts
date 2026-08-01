import type { Prisma, QueueJob } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';

export interface IQueueJobRepository extends IRepository<QueueJob> {
  create(data: Prisma.QueueJobCreateInput, options?: RepositoryOptions): Promise<QueueJob>;
  update(
    id: string,
    data: Prisma.QueueJobUpdateInput,
    options?: RepositoryOptions,
  ): Promise<QueueJob>;
  findWaiting(options?: FindManyOptions): Promise<QueueJob[]>;
  findRunning(options?: FindManyOptions): Promise<QueueJob[]>;
  findFailed(options?: FindManyOptions): Promise<QueueJob[]>;
}
