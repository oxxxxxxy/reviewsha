import { describe, expect, it, vi } from 'vitest';
import { UploadStatus } from '@prisma/client';
import { AnalysisService } from '../../../../src/modules/pipeline/analysis.service';

const user = { id: 'user-1', role: 'USER' } as never;

function setup() {
  const projects = {
    findByIdForOwnerIncludingDeleted: vi.fn(async () => ({ id: 'project-1', deletedAt: null })),
  };
  const scans = {
    findByProject: vi.fn(async () => [
      {
        id: 'scan-1',
        projectId: 'project-1',
        sourceFileId: 'upload-1',
        status: 'ANALYZING',
        pipelineStatus: 'RUNNING',
        pipelineStep: 'ANALYZE',
        progress: 70,
        pipelineErrorMessage: null,
        createdAt: new Date('2026-08-10T00:00:00Z'),
        finishedAt: null,
      },
    ]),
    countByProject: vi.fn(async () => 1),
  };
  const uploads = {
    findLatestByProject: vi.fn(async () => ({
      id: 'upload-1',
      projectId: 'project-1',
      version: 1,
      status: UploadStatus.COMPLETED,
      deletedAt: null,
    })),
    findById: vi.fn(),
  };
  const pipeline = {
    startPipeline: vi.fn(async () => ({
      id: 'scan-1',
      projectId: 'project-1',
      sourceFileId: 'upload-1',
      status: 'QUEUED',
      pipelineStatus: 'RUNNING',
      pipelineStep: 'EXTRACT',
      progress: 0,
      pipelineErrorMessage: null,
      createdAt: new Date('2026-08-10T00:00:00Z'),
      finishedAt: null,
    })),
  };
  return {
    service: new AnalysisService(
      projects as never,
      scans as never,
      uploads as never,
      pipeline as never,
    ),
    projects,
    scans,
    uploads,
    pipeline,
  };
}

describe('AnalysisService', () => {
  it('lists analyses with pagination and progress fields', async () => {
    const { service } = setup();
    await expect(service.list(user, 'project-1', 2, 10)).resolves.toMatchObject({
      data: [{ id: 'scan-1', progress: 70, currentStep: 'ANALYZE' }],
      meta: { page: 2, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('starts analysis from the latest completed upload', async () => {
    const { service, pipeline } = setup();
    await service.start(user, 'project-1');
    expect(pipeline.startPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ uploadId: 'upload-1', projectId: 'project-1', version: 1 }),
    );
  });

  it('rejects access to an unavailable project', async () => {
    const { service, projects } = setup();
    projects.findByIdForOwnerIncludingDeleted.mockResolvedValue(null as never);
    await expect(service.list(user, 'foreign-project')).rejects.toThrow(
      'You cannot access this project',
    );
  });
});
