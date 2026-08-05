import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadStatus } from '@prisma/client';
import { UploadsController } from '../../../../src/modules/uploads/controllers/uploads.controller';
import { UploadsService } from '../../../../src/modules/uploads/services/uploads.service';

const projectId = '00000000-0000-4000-8000-000000000001';
const response = {
  id: '00000000-0000-4000-8000-000000000002',
  fileName: 'project.zip',
  storageKey: 'users/user/projects/project/uploads/upload.zip',
  status: UploadStatus.COMPLETED,
  version: 1,
  size: 32,
  mimeType: 'application/zip',
  checksum: 'sha256:test',
  createdAt: '2026-08-05T12:00:00.000Z',
};

describe('UploadsController HTTP integration', () => {
  let app: INestApplication;
  let service: { create: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = {
      create: vi.fn(async () => response),
      list: vi.fn(async () => ({ data: [response] })),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [{ provide: UploadsService, useValue: service }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = { id: '00000000-0000-4000-8000-000000000010', email: 'user@test', role: 'USER' };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => app.close());

  it('accepts multipart upload requests', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect(201);
    expect(service.create).toHaveBeenCalledOnce();
  });
  it('passes the project id to the service', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip');
    expect(service.create).toHaveBeenCalledWith(
      expect.anything(),
      projectId,
      expect.objectContaining({ originalname: 'project.zip' }),
    );
  });
  it('returns the completed upload response', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect(({ body }) => expect(body.version).toBe(1));
  });
  it('documents a ZIP multipart content type', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect('content-type', /json/);
  });
  it('lists project upload history', async () => {
    await request(app.getHttpServer()).get(`/api/v1/projects/${projectId}/uploads`).expect(200);
    expect(service.list).toHaveBeenCalledWith(expect.anything(), projectId);
  });
  it('returns upload history data', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/uploads`)
      .expect(({ body }) => expect(body.data).toHaveLength(1));
  });
  it('rejects malformed project UUIDs', async () => {
    await request(app.getHttpServer()).get('/api/v1/projects/not-a-uuid/uploads').expect(400);
  });
  it('rejects malformed upload project UUIDs', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/projects/not-a-uuid/uploads')
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect(400);
  });
  it('supports repeated version requests', async () => {
    service.create
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce({ ...response, version: 2 });
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip');
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip');
    expect(service.create).toHaveBeenCalledTimes(2);
  });
  it('returns version two when service creates a second version', async () => {
    service.create.mockResolvedValue({ ...response, version: 2 });
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect(({ body }) => expect(body.version).toBe(2));
  });
  it('preserves checksum in the response', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect(({ body }) => expect(body.checksum).toContain('sha256'));
  });
  it('preserves the generated storage key', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect(({ body }) => expect(body.storageKey).toContain('/uploads/'));
  });
  it('returns MIME type metadata', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect(({ body }) => expect(body.mimeType).toBe('application/zip'));
  });
  it('returns file size metadata', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect(({ body }) => expect(body.size).toBe(32));
  });
  it('returns upload status metadata', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .attach('file', Buffer.from('zip'), 'project.zip')
      .expect(({ body }) => expect(body.status).toBe('COMPLETED'));
  });
  it('returns empty history when the service has no uploads', async () => {
    service.list.mockResolvedValue({ data: [] });
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/uploads`)
      .expect(({ body }) => expect(body).toEqual({ data: [] }));
  });
});
