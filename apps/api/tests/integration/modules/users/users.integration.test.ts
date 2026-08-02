import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Role, type User } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from '../../../../src/common/http-exception.filter';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import { UserRepository } from '../../../../src/repositories/user/user.repository';
import { UsersController } from '../../../../src/modules/users/controllers/users.controller';
import { UsersService } from '../../../../src/modules/users/services/users.service';

const userId = '00000000-0000-4000-8000-000000000001';
const now = new Date('2026-08-02T10:00:00.000Z');

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: userId,
    email: 'developer@reviewsha.local',
    passwordHash: 'sha256:secret',
    displayName: 'Developer',
    avatarUrl: null,
    role: Role.USER,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function createRepositoryMock() {
  return {
    findMany: vi.fn().mockResolvedValue({ items: [createUser()], total: 1 }),
    findById: vi.fn().mockResolvedValue(createUser()),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(createUser()),
    update: vi.fn().mockResolvedValue(createUser({ displayName: 'Updated Developer' })),
    delete: vi.fn().mockResolvedValue(createUser()),
  };
}

describe('UsersModule HTTP integration', () => {
  let app: INestApplication;
  let repository: ReturnType<typeof createRepositoryMock>;
  let logger: { log: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repository = createRepositoryMock();
    logger = { log: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        { provide: UserRepository, useValue: repository },
        { provide: ApiLoggerService, useValue: logger },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const swaggerDocument = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Reviewsha API').setVersion('0.1.0').build(),
    );
    SwaggerModule.setup('api/v1/docs', app, swaggerDocument, {
      jsonDocumentUrl: 'api/v1/docs-json',
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs a full user CRUD cycle', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'developer@reviewsha.local',
        password: 'strong-password',
        displayName: 'Developer',
      })
      .expect(201)
      .expect(({ body }) => expect(body.passwordHash).toBeUndefined());

    await request(app.getHttpServer()).get(`/users/${userId}`).expect(200);
    await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .send({ displayName: 'Updated Developer' })
      .expect(200);
    await request(app.getHttpServer()).delete(`/users/${userId}`).expect(204);
  });

  it('rejects duplicate email with 409', async () => {
    repository.findByEmail.mockResolvedValue(createUser());

    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'developer@reviewsha.local',
        password: 'strong-password',
        displayName: 'Developer',
      })
      .expect(409);
  });

  it('validates create payload with 400', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'invalid', password: 'short', displayName: 'D' })
      .expect(400);
  });

  it('supports search query', async () => {
    await request(app.getHttpServer()).get('/users?search=developer').expect(200);

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'developer' }),
    );
  });

  it('returns list response with items and meta', async () => {
    await request(app.getHttpServer())
      .get('/users?page=1&limit=20')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveProperty('items');
        expect(body).toHaveProperty('meta');
        expect(body.meta).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
      });
  });

  it('supports sorting query', async () => {
    await request(app.getHttpServer()).get('/users?sort=email&order=asc').expect(200);

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'email', order: 'asc' }),
    );
  });

  it('exposes Users endpoints in Swagger document', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Reviewsha API').setVersion('0.1.0').build(),
    );

    expect(Object.keys(document.paths)).toEqual(expect.arrayContaining(['/users', '/users/{id}']));
  });

  it('logs operations without revealing passwords', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'developer@reviewsha.local',
        password: 'strong-password',
        displayName: 'Developer',
      })
      .expect(201);

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('User created'),
      'UsersService',
    );
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('strong-password');
  });
});
