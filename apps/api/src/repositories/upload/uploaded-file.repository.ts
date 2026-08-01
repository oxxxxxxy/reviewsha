import { Injectable } from '@nestjs/common';
import type { Prisma, UploadedFile } from '@prisma/client';
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

  findByProject(projectId: string, options?: FindManyOptions): Promise<UploadedFile[]> {
    return this.getClient(options).uploadedFile.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
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
