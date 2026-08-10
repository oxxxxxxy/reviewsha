import { Injectable } from '@nestjs/common';
import type { Prisma, UploadedFile, UploadStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';
import type { IUploadedFileRepository } from './uploaded-file.repository.interface';

@Injectable()
export class UploadedFileRepository
  extends BaseRepository<UploadedFile>
  implements IUploadedFileRepository
{
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<UploadedFile> {
    return client.uploadedFile as unknown as BaseDelegate<UploadedFile>;
  }

  create(data: Prisma.UploadedFileCreateInput, options?: RepositoryOptions): Promise<UploadedFile> {
    return this.getClient(options).uploadedFile.create({ data });
  }

  async createNextVersion(
    projectId: string,
    data: Omit<Prisma.UploadedFileCreateInput, 'version'>,
  ): Promise<UploadedFile> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const latest = await tx.uploadedFile.findFirst({
              where: { projectId },
              orderBy: { version: 'desc' },
              select: { version: true },
            });
            return tx.uploadedFile.create({
              data: { ...data, version: (latest?.version ?? 0) + 1 },
            });
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        const code =
          error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;
        if (attempt === 3 || (code !== 'P2002' && code !== 'P2034')) throw error;
      }
    }
    throw new Error('Unable to allocate upload version');
  }

  findByProject(projectId: string, options?: FindManyOptions): Promise<UploadedFile[]> {
    return this.getClient(options).uploadedFile.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  override findById(id: string, options?: RepositoryOptions): Promise<UploadedFile | null> {
    return this.getClient(options).uploadedFile.findFirst({ where: { id, deletedAt: null } });
  }

  findLatestByProject(
    projectId: string,
    options?: RepositoryOptions,
  ): Promise<UploadedFile | null> {
    return this.getClient(options).uploadedFile.findFirst({
      where: { projectId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async getNextVersion(projectId: string, options?: RepositoryOptions): Promise<number> {
    const latest = await this.findLatestByProject(projectId, options);
    return (latest?.version ?? 0) + 1;
  }

  updateStatus(
    id: string,
    status: UploadStatus,
    options?: RepositoryOptions,
  ): Promise<UploadedFile> {
    return this.getClient(options).uploadedFile.update({ where: { id }, data: { status } });
  }

  update(
    id: string,
    data: Prisma.UploadedFileUpdateInput,
    options?: RepositoryOptions,
  ): Promise<UploadedFile> {
    return this.getClient(options).uploadedFile.update({ where: { id }, data });
  }

  delete(id: string, options?: RepositoryOptions): Promise<UploadedFile> {
    return this.getClient(options).uploadedFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  deleteProjectFiles(projectId: string, options?: RepositoryOptions): Promise<Prisma.BatchPayload> {
    return this.getClient(options).uploadedFile.updateMany({
      where: { projectId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
