import type { Scan } from '@prisma/client';
import { PipelineStatusDto } from './dto/pipeline-status.dto';

export class PipelineMapper {
  static toStatus(scan: Scan): PipelineStatusDto {
    return {
      id: scan.id,
      projectId: scan.projectId,
      uploadId: scan.sourceFileId ?? '',
      currentStep: scan.pipelineStep,
      status: scan.pipelineStatus,
      progress: scan.progress,
      errorCode: scan.pipelineErrorCode,
      errorMessage: scan.pipelineErrorMessage,
      startedAt: scan.pipelineStartedAt,
      finishedAt: scan.pipelineFinishedAt,
    };
  }
}
