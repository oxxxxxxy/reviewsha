import type { Prisma, UploadedFile, UploadStatus } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';

export interface IUploadedFileRepository extends IRepository<UploadedFile> {
  createNextVersion(
    projectId: string,
    data: Omit<Prisma.UploadedFileCreateInput, 'version'>,
  ): Promise<UploadedFile>;
  create(data: Prisma.UploadedFileCreateInput, options?: RepositoryOptions): Promise<UploadedFile>;
  findByProject(projectId: string, options?: FindManyOptions): Promise<UploadedFile[]>;
  findLatestByProject(projectId: string, options?: RepositoryOptions): Promise<UploadedFile | null>;
  getNextVersion(projectId: string, options?: RepositoryOptions): Promise<number>;
  updateStatus(
    id: string,
    status: UploadStatus,
    options?: RepositoryOptions,
  ): Promise<UploadedFile>;
  update(
    id: string,
    data: Prisma.UploadedFileUpdateInput,
    options?: RepositoryOptions,
  ): Promise<UploadedFile>;
  delete(id: string, options?: RepositoryOptions): Promise<UploadedFile>;
  hasActiveScan(id: string): Promise<boolean>;
  findBySourceCommit(projectId: string, commit: string): Promise<UploadedFile | null>;
  deleteProjectFiles(projectId: string, options?: RepositoryOptions): Promise<Prisma.BatchPayload>;
}
