import { createHash, randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
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
  readonly buffer: Buffer;
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
    const project =
      user.role === Role.ADMIN
        ? await this.projects.findActiveById(projectId)
        : await this.projects.findActiveByIdForOwner(projectId, user.id);
    if (!project) throw new NotFoundException('Project not found');

    const id = randomUUID();
    const version = await this.uploads.getNextVersion(projectId);
    const objectKey = `users/${user.id}/projects/${projectId}/uploads/${id}.zip`;
    const upload = await this.uploads.create({
      id,
      project: { connect: { id: projectId } },
      uploadedBy: { connect: { id: user.id } },
      objectKey,
      bucket: 'projects',
      filename: file.originalname,
      size: file.buffer.length,
      mimeType: file.mimetype,
      checksum: 'pending',
      status: UploadStatus.PENDING,
      version,
    });
    this.events.publish(UPLOAD_EVENTS.created, this.event(upload));

    try {
      await this.uploads.updateStatus(id, UploadStatus.VALIDATING);
      await this.validator.validate(file.originalname, file.mimetype, file.buffer);
      this.events.publish(UPLOAD_EVENTS.validated, this.event(upload));
      await this.uploads.updateStatus(id, UploadStatus.UPLOADING);
      const checksum = `sha256:${createHash('sha256').update(file.buffer).digest('hex')}`;
      await this.storage.upload({
        bucket: 'projects',
        key: objectKey,
        body: file.buffer,
        size: file.buffer.length,
        metadata: {
          contentType: file.mimetype,
          checksum,
          ownerId: user.id,
          projectId,
          uploadId: id,
        },
      });
      const completed = await this.uploads.update(id, { checksum, status: UploadStatus.COMPLETED });
      this.events.publish(UPLOAD_EVENTS.completed, this.event(completed));
      this.logger.log(`Upload completed: ${id} version=${version}`, 'UploadsService');
      return UploadMapper.toResponse(completed);
    } catch (error) {
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

  async list(user: AuthenticatedUser, projectId: string): Promise<UploadListResponseDto> {
    const project =
      user.role === Role.ADMIN
        ? await this.projects.findActiveById(projectId)
        : await this.projects.findActiveByIdForOwner(projectId, user.id);
    if (!project) throw new NotFoundException('Project not found');
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
