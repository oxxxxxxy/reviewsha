import { Injectable } from '@nestjs/common';
import { Prisma, Project, ProjectHistoryAction, ProjectStatus } from '@prisma/client';
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
  ProjectDetails,
  ProjectHistoryWithActor,
} from './project.repository.interface';

const projectDetailsInclude = {
  tags: { orderBy: { name: 'asc' as const } },
  _count: { select: { scans: true, uploadedFiles: true, reports: true } },
  scans: { select: { createdAt: true }, orderBy: { createdAt: 'desc' as const }, take: 1 },
} as const;

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

  findByOwnerAndName(
    ownerId: string,
    name: string,
    options?: RepositoryOptions,
  ): Promise<Project | null> {
    return this.getClient(options).project.findFirst({
      where: { ownerId, name, deletedAt: null },
    });
  }

  async findMany(params: FindProjectsParams): Promise<{ items: ProjectDetails[]; total: number }> {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(params.ownerId ? { ownerId: params.ownerId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
              { language: { contains: params.search, mode: 'insensitive' } },
              { tags: { some: { name: { contains: params.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.visibility ? { visibility: params.visibility } : {}),
      ...(params.tags?.length ? { tags: { some: { name: { in: params.tags } } } } : {}),
      ...(params.language ? { language: { equals: params.language, mode: 'insensitive' } } : {}),
      ...(params.createdFrom || params.createdTo
        ? {
            createdAt: {
              ...(params.createdFrom ? { gte: params.createdFrom } : {}),
              ...(params.createdTo ? { lte: params.createdTo } : {}),
            },
          }
        : {}),
    };
    const orderBy: Prisma.ProjectOrderByWithRelationInput =
      params.sort === 'analysesCount'
        ? { scans: { _count: params.order ?? 'desc' } }
        : { [params.sort ?? 'createdAt']: params.order ?? 'desc' };
    const client = this.getClient(params);
    const [items, total] = await Promise.all([
      client.project.findMany({
        where,
        include: projectDetailsInclude,
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      client.project.count({ where }),
    ]);

    return { items, total };
  }

  findActiveById(id: string, options?: RepositoryOptions): Promise<ProjectDetails | null> {
    return this.getClient(options).project.findFirst({
      where: { id, deletedAt: null },
      include: projectDetailsInclude,
    }) as Promise<ProjectDetails | null>;
  }

  findActiveByIdForOwner(
    id: string,
    ownerId: string,
    options?: RepositoryOptions,
  ): Promise<ProjectDetails | null> {
    return this.getClient(options).project.findFirst({
      where: { id, ownerId, deletedAt: null },
      include: projectDetailsInclude,
    }) as Promise<ProjectDetails | null>;
  }

  findByIdForOwnerIncludingDeleted(
    id: string,
    ownerId?: string,
    options?: RepositoryOptions,
  ): Promise<ProjectDetails | null> {
    return this.getClient(options).project.findFirst({
      where: { id, ...(ownerId ? { ownerId } : {}) },
      include: projectDetailsInclude,
    }) as Promise<ProjectDetails | null>;
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

  restore(id: string, options?: RepositoryOptions): Promise<Project> {
    return this.update(
      id,
      { archivedAt: null, deletedAt: null, status: ProjectStatus.ACTIVE },
      options,
    );
  }

  delete(id: string, options?: RepositoryOptions): Promise<Project> {
    return this.update(id, { deletedAt: new Date(), status: ProjectStatus.DELETED }, options);
  }

  async syncTags(projectId: string, tags: string[], options?: RepositoryOptions): Promise<void> {
    const client = this.getClient(options);
    await client.projectTag.deleteMany({ where: { projectId } });
    if (tags.length > 0) {
      await client.projectTag.createMany({
        data: tags.map((name) => ({ projectId, name })),
      });
    }
  }

  createHistory(
    projectId: string,
    actorId: string,
    action: ProjectHistoryAction,
    changedFields?: Prisma.InputJsonValue,
    options?: RepositoryOptions,
  ) {
    return this.getClient(options).projectHistory.create({
      data: { projectId, actorId, action, changedFields },
    });
  }

  findHistory(projectId: string, options?: RepositoryOptions): Promise<ProjectHistoryWithActor[]> {
    return this.getClient(options).projectHistory.findMany({
      where: { projectId },
      include: { actor: { select: { email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ProjectHistoryWithActor[]>;
  }
}
