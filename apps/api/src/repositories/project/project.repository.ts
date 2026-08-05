import { Injectable } from '@nestjs/common';
import { Prisma, Project, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type {
  FindManyOptions,
  FindProjectsParams,
  IProjectRepository,
} from './project.repository.interface';

@Injectable()
export class ProjectRepository extends BaseRepository<Project> implements IProjectRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<Project> {
    return client.project as unknown as BaseDelegate<Project>;
  }

  findByOwner(ownerId: string, options?: FindManyOptions): Promise<Project[]> {
    return this.getClient(options).project.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  async findMany(params: FindProjectsParams): Promise<{ items: Project[]; total: number }> {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(params.ownerId ? { ownerId: params.ownerId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
              { language: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.visibility ? { visibility: params.visibility } : {}),
    };
    const orderBy = {
      [params.sort ?? 'createdAt']: params.order ?? 'desc',
    } as Prisma.ProjectOrderByWithRelationInput;
    const client = this.getClient(params);
    const [items, total] = await Promise.all([
      client.project.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      client.project.count({ where }),
    ]);

    return { items, total };
  }

  findActiveById(id: string, options?: RepositoryOptions): Promise<Project | null> {
    return this.getClient(options).project.findFirst({ where: { id, deletedAt: null } });
  }

  findActiveByIdForOwner(
    id: string,
    ownerId: string,
    options?: RepositoryOptions,
  ): Promise<Project | null> {
    return this.getClient(options).project.findFirst({
      where: { id, ownerId, deletedAt: null },
    });
  }

  create(data: Prisma.ProjectCreateInput, options?: RepositoryOptions): Promise<Project> {
    return this.getClient(options).project.create({ data });
  }

  update(
    id: string,
    data: Prisma.ProjectUpdateInput,
    options?: RepositoryOptions,
  ): Promise<Project> {
    return this.getClient(options).project.update({ where: { id }, data });
  }

  archive(id: string, options?: RepositoryOptions): Promise<Project> {
    return this.update(id, { archivedAt: new Date(), status: ProjectStatus.ARCHIVED }, options);
  }

  delete(id: string, options?: RepositoryOptions): Promise<Project> {
    return this.update(id, { deletedAt: new Date(), status: ProjectStatus.DELETED }, options);
  }
}
