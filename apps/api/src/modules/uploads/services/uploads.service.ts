import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, UploadStatus } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ProjectRepository } from '../../../repositories/project/project.repository';
import { UploadedFileRepository } from '../../../repositories/upload/uploaded-file.repository';
import { StorageService } from '../../storage/services/storage.service';
import { StorageUnavailableException } from '../../storage/exceptions/storage.exceptions';
import { UploadMapper } from '../mappers/upload.mapper';
import { UploadEvents, UPLOAD_EVENTS } from '../events/upload.events';
import { ZipValidator } from '../validators/zip.validator';
import { UploadFailedException } from '../exceptions/upload.exceptions';
import { UploadListResponseDto, UploadResponseDto } from '../dto/upload-response.dto';

export interface UploadFileInput {
  readonly originalname: string;
  readonly mimetype: string;
  readonly buffer?: Buffer;
  readonly path?: string;
  readonly size?: number;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly uploads: UploadedFileRepository,
    private readonly storage: StorageService,
    private readonly validator: ZipValidator,
    private readonly events: UploadEvents,
    private readonly logger: ApiLoggerService,
  ) {}

  async create(
    user: AuthenticatedUser,
    projectId: string,
    file: UploadFileInput,
  ): Promise<UploadResponseDto> {
    try {
      return await this.createUpload(user, projectId, file);
    } finally {
      if (file.path) await rm(file.path, { force: true }).catch(() => undefined);
    }
  }

  private async createUpload(
    user: AuthenticatedUser,
    projectId: string,
    file: UploadFileInput,
  ): Promise<UploadResponseDto> {
    const size = file.size ?? file.buffer?.length ?? 0;
    const project = await this.projects.findActiveById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && project.ownerId !== user.id) {
      throw new ForbiddenException('You cannot upload to this project');
    }

    const id = randomUUID();
    const objectKey = `users/${user.id}/projects/${projectId}/uploads/${id}.zip`;
    const upload = await this.uploads.createNextVersion(projectId, {
      id,
      project: { connect: { id: projectId } },
      uploadedBy: { connect: { id: user.id } },
      objectKey,
      bucket: 'projects',
      filename: file.originalname,
      size,
      mimeType: file.mimetype,
      checksum: 'pending',
      status: UploadStatus.PENDING,
    });
    const version = upload.version;
    this.events.publish(UPLOAD_EVENTS.created, this.event(upload));

    let objectStored = false;
    try {
      await this.uploads.updateStatus(id, UploadStatus.VALIDATING);
      if (file.path) {
        await this.validator.validateFile(file.originalname, file.mimetype, size, file.path);
      } else if (file.buffer) {
        await this.validator.validate(file.originalname, file.mimetype, file.buffer);
      } else {
        throw new UploadFailedException();
      }
      this.events.publish(UPLOAD_EVENTS.validated, this.event(upload));
      await this.uploads.updateStatus(id, UploadStatus.UPLOADING);
      const checksum = `sha256:${await this.checksum(file)}`;
      await this.storage.upload({
        bucket: 'projects',
        key: objectKey,
        body: file.path ? createReadStream(file.path) : file.buffer!,
        size,
        metadata: {
          contentType: file.mimetype,
          checksum,
          ownerId: user.id,
          projectId,
          uploadId: id,
        },
      });
      objectStored = true;
      const completed = await this.uploads.update(id, { checksum, status: UploadStatus.COMPLETED });
      this.events.publish(UPLOAD_EVENTS.completed, this.event(completed));
      this.logger.log(`Upload completed: ${id} version=${version}`, 'UploadsService');
      return UploadMapper.toResponse(completed);
    } catch (error) {
      if (objectStored) {
        await this.storage.delete('projects', objectKey).catch(() => undefined);
      }
      await this.uploads.updateStatus(id, UploadStatus.FAILED).catch(() => undefined);
      this.events.publish(UPLOAD_EVENTS.failed, {
        ...this.event(upload),
        reason: error instanceof Error ? error.message : 'unknown',
      });
      if (error instanceof StorageUnavailableException) throw error;
      if (error instanceof Error && error.name.endsWith('Exception')) throw error;
      throw new UploadFailedException();
    }
  }

  private async checksum(file: UploadFileInput): Promise<string> {
    const hash = createHash('sha256');
    const stream = file.path ? createReadStream(file.path) : file.buffer;
    if (!stream) throw new UploadFailedException();
    if (Buffer.isBuffer(stream)) hash.update(stream);
    else {
      for await (const chunk of stream) hash.update(chunk as Buffer);
    }
    return hash.digest('hex');
  }

  async list(user: AuthenticatedUser, projectId: string): Promise<UploadListResponseDto> {
    const project = await this.projects.findActiveById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && project.ownerId !== user.id) {
      throw new ForbiddenException('You cannot access uploads for this project');
    }
    return UploadMapper.toListResponse(await this.uploads.findByProject(projectId));
  }

  private event(upload: {
    id: string;
    projectId: string;
    uploadedById: string | null;
    version: number;
  }) {
    return {
      uploadId: upload.id,
      projectId: upload.projectId,
      userId: upload.uploadedById ?? '',
      version: upload.version,
      occurredAt: new Date().toISOString(),
    };
  }
}
