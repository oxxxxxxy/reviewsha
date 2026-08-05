import 'reflect-metadata';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { PipelineStatus, PipelineStep, ScanStatus, type Scan } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PipelineController } from '../../../../src/modules/pipeline/pipeline.controller';
import { PipelineService } from '../../../../src/modules/pipeline/pipeline.service';

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'developer@reviewsha.local',
  role: 'USER',
} as const;

function fixture(): Scan {
  return {
    id: '00000000-0000-4000-8000-000000000010',
    projectId: '00000000-0000-4000-8000-000000000011',
    sourceFileId: '00000000-0000-4000-8000-000000000012',
    createdById: user.id,
    status: ScanStatus.ANALYZING,
    progress: 70,
    startedAt: new Date('2026-08-06T00:00:00.000Z'),
    finishedAt: null,
    createdAt: new Date('2026-08-06T00:00:00.000Z'),
    deletedAt: null,
    pipelineStep: PipelineStep.ANALYZE,
    pipelineStatus: PipelineStatus.RUNNING,
    pipelineErrorCode: null,
    pipelineErrorMessage: null,
    pipelineErrorStack: null,
    pipelineAttempts: 1,
    pipelineStartedAt: new Date('2026-08-06T00:00:00.000Z'),
    pipelineFinishedAt: null,
    pipelineErrorAt: null,
  };
}

describe('Pipeline status HTTP API', () => {
  let app: INestApplication;
  let service: {
    getProgressForUser: ReturnType<typeof vi.fn>;
    resumeForUser: ReturnType<typeof vi.fn>;
    cancelForUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      getProgressForUser: vi.fn(async () => fixture()),
      resumeForUser: vi.fn(async () => undefined),
      cancelForUser: vi.fn(async () => undefined),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [PipelineController],
      providers: [{ provide: PipelineService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = user;
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => app.close());

  it('returns pipeline status', async () => {
    await request(app.getHttpServer()).get('/api/v1/pipelines/scan-1').expect(200);
  });

  it('returns progress and current step', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pipelines/scan-1')
      .expect(({ body }) => {
        expect(body.data.progress).toBe(70);
        expect(body.data.currentStep).toBe('ANALYZE');
      });
  });

  it('returns the pipeline and project identifiers', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pipelines/scan-1')
      .expect(({ body }) =>
        expect(body.data).toMatchObject({ id: fixture().id, projectId: fixture().projectId }),
      );
  });

  it('passes the authenticated user to status lookup', async () => {
    await request(app.getHttpServer()).get('/api/v1/pipelines/scan-1');
    expect(service.getProgressForUser).toHaveBeenCalledWith(user, 'scan-1');
  });

  it('resumes a pipeline', async () => {
    await request(app.getHttpServer()).post('/api/v1/pipelines/scan-1/resume').expect(201);
    expect(service.resumeForUser).toHaveBeenCalledWith(user, 'scan-1');
  });

  it('returns status after resume', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pipelines/scan-1/resume')
      .expect(({ body }) => expect(body.data.status).toBe('RUNNING'));
  });

  it('cancels a pipeline', async () => {
    await request(app.getHttpServer()).post('/api/v1/pipelines/scan-1/cancel').expect(201);
    expect(service.cancelForUser).toHaveBeenCalledWith(user, 'scan-1');
  });

  it('returns status after cancellation', async () => {
    service.getProgressForUser.mockResolvedValue({
      ...fixture(),
      pipelineStatus: PipelineStatus.CANCELLED,
    });
    await request(app.getHttpServer())
      .post('/api/v1/pipelines/scan-1/cancel')
      .expect(({ body }) => expect(body.data.status).toBe('CANCELLED'));
  });

  it('does not expose token or storage fields', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pipelines/scan-1')
      .expect(({ body }) => {
        expect(body.data).not.toHaveProperty('token');
        expect(body.data).not.toHaveProperty('storageKey');
      });
  });

  it('supports arbitrary pipeline identifiers for service-level lookup', async () => {
    await request(app.getHttpServer()).get('/api/v1/pipelines/pipeline-42').expect(200);
    expect(service.getProgressForUser).toHaveBeenCalledWith(user, 'pipeline-42');
  });

  it('returns an API envelope for status', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pipelines/scan-1')
      .expect(({ body }) => {
        expect(Object.keys(body)).toEqual(['data']);
      });
  });
});
