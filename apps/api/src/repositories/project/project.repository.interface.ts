import type { Prisma, Project } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';

export interface FindManyOptions extends RepositoryOptions {
  readonly skip?: number;
  readonly take?: number;
}

export interface IProjectRepository extends IRepository<Project> {
  findByOwner(ownerId: string, options?: FindManyOptions): Promise<Project[]>;
  create(data: Prisma.ProjectCreateInput, options?: RepositoryOptions): Promise<Project>;
  update(
    id: string,
    data: Prisma.ProjectUpdateInput,
    options?: RepositoryOptions,
  ): Promise<Project>;
  archive(id: string, options?: RepositoryOptions): Promise<Project>;
  delete(id: string, options?: RepositoryOptions): Promise<Project>;
}
