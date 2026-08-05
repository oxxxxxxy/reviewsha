import 'reflect-metadata';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProjectStatus, Role, Visibility, type Project } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsController } from '../../../../src/modules/projects/controllers/projects.controller';
import { ProjectsService } from '../../../../src/modules/projects/services/projects.service';
import { ProjectEvents } from '../../../../src/modules/projects/events/project.events';
import { ProjectRepository } from '../../../../src/repositories/project/project.repository';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';

function fixture(): Project {
  const now = new Date('2026-08-05T12:00:00.000Z');
  return {
    id: '00000000-0000-4000-8000-000000000010',
    ownerId: '00000000-0000-4000-8000-000000000001',
    organizationId: null,
    name: 'Reviewsha API',
    description: 'Backend',
    language: 'TypeScript',
    visibility: Visibility.PRIVATE,
    status: ProjectStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
  };
}

describe('ProjectsModule HTTP integration', () => {
  let app: INestApplication;
  let repository: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    const project = fixture();
    repository = {
      findMany: vi.fn(async () => ({ items: [project], total: 1 })),
      findActiveById: vi.fn(async () => project),
      findActiveByIdForOwner: vi.fn(async () => project),
      create: vi.fn(async () => project),
      update: vi.fn(async () => project),
      archive: vi.fn(async () => ({ ...project, status: ProjectStatus.ARCHIVED })),
      delete: vi.fn(async () => ({ ...project, status: ProjectStatus.DELETED })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        ProjectsService,
        ProjectEvents,
        { provide: ProjectRepository, useValue: repository },
        { provide: ApiLoggerService, useValue: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use((request: { user?: unknown }, _response: unknown, next: () => void) => {
      request.user = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'developer@reviewsha.local',
        role: Role.USER,
      };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => app.close());

  it('lists projects with the documented envelope and pagination metadata', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/projects?page=1&limit=20')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.meta).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
      });
  });

  it('creates a project through DTO validation and service', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/projects')
      .send({ name: 'New project', language: 'TypeScript' })
      .expect(201)
      .expect(({ body }) => expect(body.data.name).toBe('Reviewsha API'));

    expect(repository.create).toHaveBeenCalledOnce();
  });

  it('rejects an invalid project payload', async () => {
    await request(app.getHttpServer()).post('/api/v1/projects').send({ name: '' }).expect(400);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
