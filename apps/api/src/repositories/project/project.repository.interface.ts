import type {
  Prisma,
  Project,
  ProjectHistory,
  ProjectHistoryAction,
  ProjectTag,
} from '@prisma/client';
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
  readonly tags?: string[];
  readonly language?: string;
  readonly createdFrom?: Date;
  readonly createdTo?: Date;
  readonly sort?: 'createdAt' | 'updatedAt' | 'name' | 'lastAnalysisAt' | 'analysesCount';
  readonly order?: 'asc' | 'desc';
}

export type ProjectDetails = Project & {
  tags: ProjectTag[];
  _count: { scans: number; uploadedFiles: number };
  scans: Array<{ createdAt: Date }>;
};

export interface ProjectHistoryWithActor extends ProjectHistory {
  actor: { email: string; displayName: string };
}

export interface IProjectRepository extends IRepository<Project> {
  findByOwner(ownerId: string, options?: FindManyOptions): Promise<Project[]>;
  findByOwnerAndName(
    ownerId: string,
    name: string,
    options?: RepositoryOptions,
  ): Promise<Project | null>;
  findMany(params: FindProjectsParams): Promise<{ items: ProjectDetails[]; total: number }>;
  findActiveById(id: string, options?: RepositoryOptions): Promise<ProjectDetails | null>;
  findActiveByIdForOwner(
    id: string,
    ownerId: string,
    options?: RepositoryOptions,
  ): Promise<ProjectDetails | null>;
  findByIdForOwnerIncludingDeleted(
    id: string,
    ownerId?: string,
    options?: RepositoryOptions,
  ): Promise<ProjectDetails | null>;
  syncTags(projectId: string, tags: string[], options?: RepositoryOptions): Promise<void>;
  createHistory(
    projectId: string,
    actorId: string,
    action: ProjectHistoryAction,
    changedFields?: Prisma.InputJsonValue,
    options?: RepositoryOptions,
  ): Promise<ProjectHistory>;
  findHistory(projectId: string, options?: RepositoryOptions): Promise<ProjectHistoryWithActor[]>;
  restore(id: string, options?: RepositoryOptions): Promise<Project>;
  create(data: Prisma.ProjectCreateInput, options?: RepositoryOptions): Promise<Project>;
  update(
    id: string,
    data: Prisma.ProjectUpdateInput,
    options?: RepositoryOptions,
  ): Promise<Project>;
  archive(id: string, options?: RepositoryOptions): Promise<Project>;
  delete(id: string, options?: RepositoryOptions): Promise<Project>;
}
