import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/types/auth.types';
import { ProjectRepository } from '../../repositories/project/project.repository';
import { ScanRepository } from '../../repositories/scan/scan.repository';
import { UploadedFileRepository } from '../../repositories/upload/uploaded-file.repository';
import type { UploadEvent } from '../uploads/events/upload.events';
import { PipelineService } from './pipeline.service';
import { AnalysisResponseDto, AnalysesListResponseDto } from './dto/analysis-response.dto';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly scans: ScanRepository,
    private readonly uploads: UploadedFileRepository,
    private readonly pipeline: PipelineService,
  ) {}

  async list(
    user: AuthenticatedUser,
    projectId: string,
    page = 1,
    limit = 20,
  ): Promise<AnalysesListResponseDto> {
    await this.assertProject(user, projectId);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [data, total] = await Promise.all([
      this.scans.findByProject(projectId, {
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.scans.countByProject(projectId),
    ]);
    return {
      data: data.map((scan) => this.toResponse(scan)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async start(
    user: AuthenticatedUser,
    projectId: string,
    uploadId?: string,
  ): Promise<{ data: AnalysisResponseDto }> {
    await this.assertProject(user, projectId);
    const upload = uploadId
      ? await this.uploads.findById(uploadId)
      : await this.uploads.findLatestByProject(projectId);
    if (
      !upload ||
      upload.projectId !== projectId ||
      upload.deletedAt ||
      upload.status !== 'COMPLETED'
    ) {
      throw new NotFoundException('A completed project upload is required');
    }
    const scan = await this.pipeline.startPipeline({
      uploadId: upload.id,
      projectId,
      userId: user.id,
      version: upload.version,
      occurredAt: new Date().toISOString(),
    } satisfies UploadEvent);
    if (!scan) throw new NotFoundException('Analysis could not be started');
    return { data: this.toResponse(scan) };
  }

  private async assertProject(user: AuthenticatedUser, projectId: string): Promise<void> {
    const admin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    const project = await this.projects.findByIdForOwnerIncludingDeleted(
      projectId,
      admin ? undefined : user.id,
    );
    if (!project || project.deletedAt) {
      throw new ForbiddenException('You cannot access this project');
    }
  }

  private toResponse(scan: {
    id: string;
    projectId: string;
    sourceFileId: string | null;
    status: string;
    pipelineStatus: string | null;
    pipelineStep: string | null;
    progress: number;
    pipelineErrorMessage: string | null;
    createdAt: Date;
    finishedAt: Date | null;
  }): AnalysisResponseDto {
    return {
      id: scan.id,
      projectId: scan.projectId,
      uploadId: scan.sourceFileId,
      status: scan.status,
      pipelineStatus: scan.pipelineStatus,
      currentStep: scan.pipelineStep,
      progress: scan.progress,
      errorMessage: scan.pipelineErrorMessage,
      createdAt: scan.createdAt,
      finishedAt: scan.finishedAt,
    };
  }
}
