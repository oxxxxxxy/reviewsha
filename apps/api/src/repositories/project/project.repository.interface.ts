import type { Prisma, Project } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';

export interface FindManyOptions extends RepositoryOptions {
  readonly skip?: number;
  readonly take?: number;
}

export interface FindProjectsParams extends FindManyOptions {
  readonly ownerId?: string;
  readonly search?: string;
  readonly status?: Project['status'];
  readonly visibility?: Project['visibility'];
  readonly sort?: 'createdAt' | 'updatedAt' | 'name';
  readonly order?: 'asc' | 'desc';
}

export interface IProjectRepository extends IRepository<Project> {
  findByOwner(ownerId: string, options?: FindManyOptions): Promise<Project[]>;
  findMany(params: FindProjectsParams): Promise<{ items: Project[]; total: number }>;
  findActiveById(id: string, options?: RepositoryOptions): Promise<Project | null>;
  findActiveByIdForOwner(
    id: string,
    ownerId: string,
    options?: RepositoryOptions,
  ): Promise<Project | null>;
  create(data: Prisma.ProjectCreateInput, options?: RepositoryOptions): Promise<Project>;
  update(
    id: string,
    data: Prisma.ProjectUpdateInput,
    options?: RepositoryOptions,
  ): Promise<Project>;
  archive(id: string, options?: RepositoryOptions): Promise<Project>;
  delete(id: string, options?: RepositoryOptions): Promise<Project>;
}
