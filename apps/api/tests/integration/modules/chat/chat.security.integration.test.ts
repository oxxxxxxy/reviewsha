import 'reflect-metadata';

import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnershipGuard } from '../../../../src/common/auth/guards/ownership.guard';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import { ChatController } from '../../../../src/modules/chat/controllers/chat.controller';
import { ChatService } from '../../../../src/modules/chat/services/chat.service';
import { ChatSessionService } from '../../../../src/modules/chat/services/chat-session.service';
import { ChatStreamingService } from '../../../../src/modules/chat/services/chat-streaming.service';
import { ProjectRepository } from '../../../../src/repositories/project/project.repository';

const ownerId = '00000000-0000-4000-8000-000000000001';
const projectId = '00000000-0000-4000-8000-000000000010';
const foreignProjectId = '00000000-0000-4000-8000-000000000011';

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest().user = { id: ownerId, role: Role.USER };
    return true;
  }
}

describe('Chat HTTP ownership integration', () => {
  let app: INestApplication;
  const projects = {
    findByIdForOwnerIncludingDeleted: vi.fn(async (id: string) =>
      id === projectId ? { id, ownerId } : null,
    ),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ProjectRepository, useValue: projects },
        { provide: ApiLoggerService, useValue: { log: vi.fn(), warn: vi.fn() } },
        {
          provide: ChatService,
          useValue: { history: vi.fn(async () => ({})), send: vi.fn(async () => ({})) },
        },
        {
          provide: ChatSessionService,
          useValue: { create: vi.fn(async () => ({})), list: vi.fn(async () => ({})) },
        },
        { provide: ChatStreamingService, useValue: { stream: vi.fn() } },
        { provide: APP_GUARD, useClass: TestAuthGuard },
        { provide: APP_GUARD, useClass: OwnershipGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => app.close());

  it('allows creating a chat for an owned project', async () => {
    await request(app.getHttpServer()).post(`/api/projects/${projectId}/chat`).send({}).expect(201);
  });

  it('rejects creating a chat for a foreign project', async () => {
    await request(app.getHttpServer())
      .post(`/api/projects/${foreignProjectId}/chat`)
      .send({})
      .expect(403);
  });

  it('rejects listing chats for a foreign project', async () => {
    await request(app.getHttpServer()).get(`/api/projects/${foreignProjectId}/chat`).expect(403);
  });

  it('never calls the session service for a foreign project', async () => {
    const create = vi.mocked(app.get(ChatSessionService).create);
    await request(app.getHttpServer())
      .post(`/api/projects/${foreignProjectId}/chat`)
      .send({})
      .expect(403);
    expect(create).not.toHaveBeenCalled();
  });
});
