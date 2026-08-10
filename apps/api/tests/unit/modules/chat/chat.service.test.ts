import {
  BadRequestException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MessageRole, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatService } from '../../../../src/modules/chat/services/chat.service';

const user = { id: 'user-1', email: 'user@example.com', role: Role.USER };
const now = new Date('2026-08-08T00:00:00Z');

describe('ChatService', () => {
  const repository = {
    findMessages: vi.fn(),
    recentMessages: vi.fn(),
    saveMessage: vi.fn(),
    findResponse: vi.fn(),
    touchSession: vi.fn(),
  };
  const sessions = { requireOwned: vi.fn() };
  const contexts = { build: vi.fn() };
  const queues = { addJob: vi.fn(), getJob: vi.fn(), getJobStatus: vi.fn() };
  const values: Record<string, number> = {
    'chat.messageMaxLength': 4000,
    'chat.requestTimeoutMs': 20,
    'chat.pollIntervalMs': 1,
  };
  const config = { get: vi.fn((key: string, fallback: number) => values[key] ?? fallback) };
  const logger = { log: vi.fn(), error: vi.fn() };
  const secrets = { redact: vi.fn((value: string) => value.replace('SECRET', '[REDACTED]')) };
  const memory = { update: vi.fn() };
  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService(
      repository as never,
      sessions as never,
      contexts as never,
      queues as never,
      config as never,
      logger as never,
      secrets as never,
      memory as never,
    );
    sessions.requireOwned.mockResolvedValue({ id: 'session-1', projectId: 'project-1' });
    contexts.build.mockResolvedValue({ text: '{"project":"Reviewsha"}', tokens: 10 });
    repository.recentMessages.mockResolvedValue([]);
    repository.saveMessage.mockResolvedValue({ id: 'message-1' });
    queues.addJob.mockResolvedValue({ id: 'job-1' });
    queues.getJobStatus.mockResolvedValue('active');
    repository.findResponse.mockResolvedValue({
      id: 'answer-1',
      role: MessageRole.ASSISTANT,
      content: 'Answer',
      tokens: 2,
      createdAt: now,
    });
    repository.touchSession.mockResolvedValue({});
  });

  it('returns paginated message history', async () => {
    repository.findMessages.mockResolvedValue({
      data: [{ id: 'm1', role: MessageRole.USER, content: 'Hi', tokens: 1, createdAt: now }],
      total: 1,
    });
    await expect(service.history(user, 'session-1', { page: 1, limit: 20 })).resolves.toEqual({
      data: [{ id: 'm1', role: MessageRole.USER, content: 'Hi', tokens: 1, createdAt: now }],
      meta: { page: 1, limit: 20, total: 1 },
    });
  });

  it.each([
    [1, 20, 0],
    [2, 20, 20],
    [4, 5, 15],
  ])('uses history offset for page %i', async (page, limit, skip) => {
    repository.findMessages.mockResolvedValue({ data: [], total: 0 });
    await service.history(user, 'session-1', { page, limit });
    expect(repository.findMessages).toHaveBeenCalledWith(
      'session-1',
      skip,
      limit,
      expect.objectContaining({ sort: undefined }),
    );
  });

  it('checks session ownership before loading history', async () => {
    repository.findMessages.mockResolvedValue({ data: [], total: 0 });
    await service.history(user, 'session-1', { page: 1, limit: 1 });
    expect(sessions.requireOwned).toHaveBeenCalledWith(user, 'session-1');
  });

  it('saves, queues and returns an assistant response', async () => {
    await expect(service.send(user, 'session-1', { message: ' Why JWT? ' })).resolves.toMatchObject(
      {
        id: 'answer-1',
        content: 'Answer',
      },
    );
    expect(repository.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: MessageRole.USER, content: 'Why JWT?' }),
    );
    expect(queues.addJob).toHaveBeenCalledWith(
      'chat.queue',
      'chat.generate',
      expect.objectContaining({ message: 'Why JWT?', context: expect.any(String) }),
    );
  });

  it.each(['', ' ', '\n'])('rejects blank message %j', async (message) => {
    await expect(service.send(user, 'session-1', { message })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a message above the configured limit', async () => {
    values['chat.messageMaxLength'] = 3;
    await expect(service.send(user, 'session-1', { message: 'four' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    values['chat.messageMaxLength'] = 4000;
  });

  it('includes recent conversation history in the job', async () => {
    repository.recentMessages.mockResolvedValue([
      { role: MessageRole.USER, content: 'Earlier question' },
      { role: MessageRole.ASSISTANT, content: 'Earlier answer' },
    ]);
    await service.send(user, 'session-1', { message: 'Next' });
    expect(queues.addJob).toHaveBeenCalledWith(
      'chat.queue',
      'chat.generate',
      expect.objectContaining({ history: expect.arrayContaining([expect.any(Object)]) }),
    );
  });

  it('touches the session after a response', async () => {
    await service.send(user, 'session-1', { message: 'Question' });
    expect(repository.touchSession).toHaveBeenCalledWith('session-1');
  });

  it('maps a failed AI job to service unavailable', async () => {
    repository.findResponse.mockResolvedValue(null);
    queues.getJobStatus.mockResolvedValue('failed');
    await expect(service.send(user, 'session-1', { message: 'Question' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('times out when no response arrives', async () => {
    repository.findResponse.mockResolvedValue(null);
    queues.getJobStatus.mockResolvedValue('active');
    await expect(service.send(user, 'session-1', { message: 'Question' })).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });

  it('does not log the user message or project context', async () => {
    await service.send(user, 'session-1', { message: 'SECRET_QUESTION' });
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('SECRET_QUESTION');
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('Reviewsha');
  });

  it('reuses an existing queued job for a retried idempotent submission', async () => {
    queues.getJob.mockResolvedValue({ id: 'existing-job' });
    await expect(
      service.send(user, 'session-1', {
        message: 'Question',
        idempotencyKey: 'retry-key',
      }),
    ).resolves.toMatchObject({ id: 'answer-1' });
    expect(queues.getJob).toHaveBeenCalledWith(
      'chat.queue',
      expect.stringMatching(/^chat-[a-f0-9]{64}$/),
    );
    expect(repository.saveMessage).not.toHaveBeenCalled();
    expect(queues.addJob).not.toHaveBeenCalled();
  });

  it('coalesces concurrent requests with the same idempotency key', async () => {
    queues.getJob.mockResolvedValue(undefined);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    queues.addJob.mockImplementationOnce(async () => {
      await gate;
      return { id: 'job-1' };
    });

    const first = service.send(user, 'session-1', {
      message: 'Question',
      idempotencyKey: 'same-key',
    });
    const second = service.send(user, 'session-1', {
      message: 'Question',
      idempotencyKey: 'same-key',
    });
    await Promise.resolve();
    release();

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(repository.saveMessage).toHaveBeenCalledOnce();
    expect(queues.addJob).toHaveBeenCalledOnce();
  });
});
