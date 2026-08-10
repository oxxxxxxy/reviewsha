import 'reflect-metadata';

import {
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
  ServiceUnavailableException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatController } from '../../../../src/modules/chat/controllers/chat.controller';
import { ChatService } from '../../../../src/modules/chat/services/chat.service';
import { ChatSessionService } from '../../../../src/modules/chat/services/chat-session.service';
import { ChatStreamingService } from '../../../../src/modules/chat/services/chat-streaming.service';

const projectId = '00000000-0000-4000-8000-000000000010';
const sessionId = '00000000-0000-4000-8000-000000000020';
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'user@reviewsha.local',
  role: Role.USER,
};
const session = {
  id: sessionId,
  title: 'New Chat',
  updatedAt: new Date('2026-08-08T00:00:00Z'),
  messagesCount: 0,
};
const answer = {
  id: '00000000-0000-4000-8000-000000000030',
  role: 'ASSISTANT',
  content: 'JWT is highlighted because issuer validation is missing.',
  tokens: 12,
  createdAt: new Date('2026-08-08T00:01:00Z'),
};

describe('Chat HTTP integration', () => {
  let app: INestApplication;
  let chat: { history: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };
  let sessions: {
    create: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    chat = {
      history: vi.fn(async () => ({ data: [answer], meta: { page: 1, limit: 50, total: 1 } })),
      send: vi.fn(async () => answer),
    };
    sessions = {
      create: vi.fn(async () => session),
      list: vi.fn(async () => ({ data: [session], meta: { page: 1, limit: 50, total: 1 } })),
      remove: vi.fn(async () => undefined),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: chat },
        { provide: ChatSessionService, useValue: sessions },
        {
          provide: ChatStreamingService,
          useValue: {
            stream: async function* () {
              yield { event: 'token', data: { token: 'Hello ' } };
              yield { event: 'complete', data: { messageId: answer.id, tokens: 1 } };
            },
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = user;
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => app.close());

  it('creates a chat session', async () => {
    await request(app.getHttpServer()).post(`/api/projects/${projectId}/chat`).send({}).expect(201);
  });

  it('returns the created session contract', async () => {
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/chat`)
      .send({ title: 'JWT review' })
      .expect(({ body }) => expect(body).toMatchObject({ id: sessionId, title: 'New Chat' }));
  });

  it('passes a custom title to the session service', async () => {
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/chat`)
      .send({ title: 'JWT review' });
    expect(sessions.create).toHaveBeenCalledWith(user, projectId, { title: 'JWT review' });
  });

  it.each(['', 'x'.repeat(181)])('rejects invalid title %j', async (title) => {
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/chat`)
      .send({ title })
      .expect(400);
  });

  it('rejects unknown create fields', async () => {
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/chat`)
      .send({ unexpected: true })
      .expect(400);
  });

  it('lists project chats', async () => {
    await request(app.getHttpServer()).get(`/api/projects/${projectId}/chat`).expect(200);
  });

  it('deletes a chat session through the ownership-aware service', async () => {
    await request(app.getHttpServer()).delete(`/api/chat/${sessionId}`).expect(204);
    expect(sessions.remove).toHaveBeenCalledWith(user, sessionId);
  });

  it('returns list metadata', async () => {
    await request(app.getHttpServer())
      .get(`/api/projects/${projectId}/chat`)
      .expect(({ body }) => expect(body.meta).toMatchObject({ page: 1, total: 1 }));
  });

  it.each([
    ['?page=2&limit=10', 2, 10],
    ['?page=3&limit=25', 3, 25],
    ['?limit=100', 1, 100],
  ])('transforms list query %s', async (query, page, limit) => {
    await request(app.getHttpServer()).get(`/api/projects/${projectId}/chat${query}`);
    expect(sessions.list).toHaveBeenCalledWith(
      user,
      projectId,
      expect.objectContaining({ page, limit }),
    );
  });

  it.each(['?page=0', '?limit=0', '?limit=101', '?page=1.2'])(
    'rejects invalid list query %s',
    async (query) => {
      await request(app.getHttpServer()).get(`/api/projects/${projectId}/chat${query}`).expect(400);
    },
  );

  it('loads message history', async () => {
    await request(app.getHttpServer()).get(`/api/chat/${sessionId}/messages`).expect(200);
  });

  it('passes history pagination', async () => {
    await request(app.getHttpServer()).get(`/api/chat/${sessionId}/messages?page=2&limit=5`);
    expect(chat.history).toHaveBeenCalledWith(
      user,
      sessionId,
      expect.objectContaining({ page: 2, limit: 5 }),
    );
  });

  it.each([
    ['search=jwt', 'search', 'jwt'],
    ['sort=desc', 'sort', 'desc'],
    ['before=2026-08-08T00%3A00%3A00.000Z', 'before', '2026-08-08T00:00:00.000Z'],
    ['after=2026-08-01T00%3A00%3A00.000Z', 'after', '2026-08-01T00:00:00.000Z'],
  ])('passes history filter %s', async (query, field, value) => {
    await request(app.getHttpServer()).get(`/api/chat/${sessionId}/messages?${query}`);
    expect(chat.history).toHaveBeenCalledWith(
      user,
      sessionId,
      expect.objectContaining({ [field]: value }),
    );
  });

  it.each(['auth', 'jwt', 'report', 'security', 'performance'])(
    'supports history search for %s',
    async (search) => {
      await request(app.getHttpServer())
        .get(`/api/chat/${sessionId}/messages?search=${search}`)
        .expect(200);
      expect(chat.history).toHaveBeenCalledWith(
        user,
        sessionId,
        expect.objectContaining({ search }),
      );
    },
  );

  it.each(['before=invalid', 'after=invalid', 'sort=random'])(
    'rejects history filter %s',
    async (query) => {
      await request(app.getHttpServer())
        .get(`/api/chat/${sessionId}/messages?${query}`)
        .expect(400);
    },
  );

  it('sends a chat message', async () => {
    await request(app.getHttpServer())
      .post(`/api/chat/${sessionId}/messages`)
      .send({ message: 'Why JWT?' })
      .expect(201);
  });

  it('accepts the standard Idempotency-Key header', async () => {
    await request(app.getHttpServer())
      .post(`/api/chat/${sessionId}/messages`)
      .set('Idempotency-Key', ' retry-key ')
      .send({ message: 'Why JWT?' })
      .expect(201);
    expect(chat.send).toHaveBeenCalledWith(
      user,
      sessionId,
      expect.objectContaining({ message: 'Why JWT?', idempotencyKey: 'retry-key' }),
    );
  });

  it('prefers a body idempotency key over the HTTP header', async () => {
    await request(app.getHttpServer())
      .post(`/api/chat/${sessionId}/messages`)
      .set('Idempotency-Key', 'header-key')
      .send({ message: 'Why JWT?', idempotencyKey: ' body-key ' })
      .expect(201);
    expect(chat.send).toHaveBeenCalledWith(
      user,
      sessionId,
      expect.objectContaining({ idempotencyKey: 'body-key' }),
    );
  });

  it('returns the assistant message contract', async () => {
    await request(app.getHttpServer())
      .post(`/api/chat/${sessionId}/messages`)
      .send({ message: 'Why JWT?' })
      .expect(({ body }) => expect(body).toMatchObject({ role: 'ASSISTANT', tokens: 12 }));
  });

  it.each(['', ' ', 'x'.repeat(4001)])('rejects invalid message %j', async (message) => {
    await request(app.getHttpServer())
      .post(`/api/chat/${sessionId}/messages`)
      .send({ message })
      .expect(400);
  });

  it('rejects unknown message fields', async () => {
    await request(app.getHttpServer())
      .post(`/api/chat/${sessionId}/messages`)
      .send({ message: 'Hi', context: 'injected' })
      .expect(400);
  });

  it('rejects malformed session identifiers before reaching the service', async () => {
    await request(app.getHttpServer())
      .post('/api/chat/not-a-uuid/messages')
      .send({ message: 'Question' })
      .expect(400);
    expect(chat.send).not.toHaveBeenCalled();
  });

  it('streams an SSE answer', async () => {
    await request(app.getHttpServer())
      .post(`/api/chat/${sessionId}/stream`)
      .send({ message: 'Hello' })
      .expect('content-type', /text\/event-stream/u)
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('event: token');
        expect(text).toContain('event: complete');
      });
  });

  it.each([
    [new NotFoundException(), 404],
    [new ForbiddenException(), 403],
    [new PreconditionFailedException(), 412],
    [new ServiceUnavailableException(), 503],
  ])('maps domain error to HTTP %i', async (error, status) => {
    chat.send.mockRejectedValue(error);
    await request(app.getHttpServer())
      .post(`/api/chat/${sessionId}/messages`)
      .send({ message: 'Question' })
      .expect(status);
  });
});
