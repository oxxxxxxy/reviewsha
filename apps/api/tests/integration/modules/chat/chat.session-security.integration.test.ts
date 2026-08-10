import 'reflect-metadata';

import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatController } from '../../../../src/modules/chat/controllers/chat.controller';
import { ChatRepository } from '../../../../src/modules/chat/repositories/chat.repository';
import { ChatService } from '../../../../src/modules/chat/services/chat.service';
import { ChatSessionService } from '../../../../src/modules/chat/services/chat-session.service';
import { ChatStreamingService } from '../../../../src/modules/chat/services/chat-streaming.service';
import { ChatContextService } from '../../../../src/modules/chat/services/chat-context.service';
import { ChatSecretFilterService } from '../../../../src/modules/chat/services/chat-secret-filter.service';
import { ChatMemoryService } from '../../../../src/modules/chat/services/chat-memory.service';
import { QueueService } from '../../../../src/modules/queue/queue.service';
import { ProjectRepository } from '../../../../src/repositories/project/project.repository';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import { ConfigService } from '@nestjs/config';

const userId = '00000000-0000-4000-8000-000000000001';
const sessionId = '00000000-0000-4000-8000-000000000020';
const foreignUserId = '00000000-0000-4000-8000-000000000002';

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest().user = { id: userId, role: Role.USER };
    return true;
  }
}

describe('Chat session HTTP authorization', () => {
  let app: INestApplication;
  const repository = {
    findSession: vi.fn(async () => ({
      id: sessionId,
      userId: foreignUserId,
      projectId: '00000000-0000-4000-8000-000000000010',
      memory: null,
      summary: null,
      activeTopic: null,
    })),
    findMessages: vi.fn(async () => ({ data: [], total: 0 })),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        ChatService,
        ChatSessionService,
        { provide: ChatRepository, useValue: repository },
        { provide: ProjectRepository, useValue: {} },
        { provide: ChatContextService, useValue: {} },
        { provide: QueueService, useValue: {} },
        { provide: ConfigService, useValue: { get: vi.fn() } },
        { provide: ApiLoggerService, useValue: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } },
        { provide: ChatSecretFilterService, useValue: {} },
        { provide: ChatMemoryService, useValue: {} },
        { provide: ChatStreamingService, useValue: { stream: vi.fn() } },
        { provide: APP_GUARD, useClass: TestAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => app.close());

  it('rejects history access for a session owned by another user', async () => {
    await request(app.getHttpServer()).get(`/api/chat/${sessionId}/messages`).expect(403);
    expect(repository.findMessages).not.toHaveBeenCalled();
  });

  it('allows history access for the session owner', async () => {
    repository.findSession.mockResolvedValueOnce({
      id: sessionId,
      userId,
      projectId: '00000000-0000-4000-8000-000000000010',
      memory: null,
      summary: null,
      activeTopic: null,
    });
    await request(app.getHttpServer()).get(`/api/chat/${sessionId}/messages`).expect(200);
    expect(repository.findMessages).toHaveBeenCalledWith(sessionId, 0, 50, {
      search: undefined,
      before: undefined,
      after: undefined,
      sort: undefined,
    });
  });
});
