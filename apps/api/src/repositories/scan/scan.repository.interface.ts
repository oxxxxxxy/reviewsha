import type { Prisma, Scan, ScanStatus } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';

export interface IScanRepository extends IRepository<Scan> {
  findByProject(projectId: string, options?: FindManyOptions): Promise<Scan[]>;
  findBySourceFile(sourceFileId: string, options?: RepositoryOptions): Promise<Scan | null>;
  create(data: Prisma.ScanCreateInput, options?: RepositoryOptions): Promise<Scan>;
  updateProgress(id: string, progress: number, options?: RepositoryOptions): Promise<Scan>;
  updateStatus(id: string, status: ScanStatus, options?: RepositoryOptions): Promise<Scan>;
  finish(id: string, status: ScanStatus, options?: RepositoryOptions): Promise<Scan>;
}
