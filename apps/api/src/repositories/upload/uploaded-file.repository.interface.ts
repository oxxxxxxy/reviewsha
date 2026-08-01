import type { Prisma, UploadedFile } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';

export interface IUploadedFileRepository extends IRepository<UploadedFile> {
  create(data: Prisma.UploadedFileCreateInput, options?: RepositoryOptions): Promise<UploadedFile>;
  findByProject(projectId: string, options?: FindManyOptions): Promise<UploadedFile[]>;
  delete(id: string, options?: RepositoryOptions): Promise<UploadedFile>;
  deleteProjectFiles(projectId: string, options?: RepositoryOptions): Promise<Prisma.BatchPayload>;
}
