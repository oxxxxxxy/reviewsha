import { MessageRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProcessor } from '../../../src/processors/chat.processor';

const payload = {
  sessionId: 'session-1',
  projectId: 'project-1',
  userId: 'user-1',
  userMessageId: 'message-1',
  system: 'Reviewsha system',
  context: '{"project":"Reviewsha"}',
  history: [{ role: MessageRole.USER, content: 'Previous' }],
  message: 'Why JWT?',
};

describe('ChatProcessor', () => {
  const db = {
    chatSession: { findFirst: vi.fn(), update: vi.fn() },
    chatMessage: { findFirst: vi.fn(), upsert: vi.fn() },
    chatUsage: { upsert: vi.fn() },
  };
  const ai = { generate: vi.fn() };
  const logger = { log: vi.fn() };
  let processor: ChatProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new ChatProcessor(db as never, ai as never, logger as never);
    db.chatSession.findFirst.mockResolvedValue({ id: 'session-1' });
    db.chatSession.update.mockResolvedValue({});
    db.chatMessage.findFirst.mockResolvedValue({ id: 'message-1' });
    db.chatMessage.upsert.mockResolvedValue({ id: 'answer-1' });
    db.chatUsage.upsert.mockResolvedValue({ id: 'usage-1' });
    ai.generate.mockResolvedValue({
      content: 'AI answer',
      model: 'deepseek',
      promptTokens: 10,
      completionTokens: 3,
      totalTokens: 13,
    });
  });

  const job = (value: unknown = payload) => ({
    id: 'job-1',
    name: 'chat.generate',
    queueName: 'chat.queue',
    data: { payload: value },
  });

  it('uses the shared AI service in text mode', async () => {
    await processor.execute(job() as never);
    expect(ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'chat', outputFormat: 'text', system: 'Reviewsha system' }),
    );
  });

  it.each([
    'PROJECT CONTEXT',
    'Reviewsha',
    'CONVERSATION HISTORY',
    'Previous',
    'CURRENT QUESTION',
    'Why JWT?',
  ])('includes %s in the prompt', async (part) => {
    await processor.execute(job() as never);
    expect(ai.generate.mock.calls[0]![0].prompt).toContain(part);
  });

  it('stores an idempotent assistant response', async () => {
    await processor.execute(job() as never);
    expect(db.chatMessage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestId: 'job-1' },
        create: expect.objectContaining({ role: MessageRole.ASSISTANT, tokens: 3 }),
      }),
    );
  });

  it('returns queue result metadata', async () => {
    await expect(processor.execute(job() as never)).resolves.toMatchObject({
      status: 'completed',
      queue: 'chat.queue',
      jobId: 'job-1',
      data: { messageId: 'answer-1', tokens: 13 },
    });
  });

  it('rejects an unknown session', async () => {
    db.chatSession.findFirst.mockResolvedValue(null);
    await expect(processor.execute(job() as never)).rejects.toThrow('CHAT_SESSION_NOT_FOUND');
  });

  it('rejects an unknown user message', async () => {
    db.chatMessage.findFirst.mockResolvedValue(null);
    await expect(processor.execute(job() as never)).rejects.toThrow('CHAT_USER_MESSAGE_NOT_FOUND');
  });

  it.each([
    null,
    {},
    { ...payload, sessionId: '' },
    { ...payload, message: '' },
    { ...payload, history: null },
  ])('rejects malformed payload %j', async (value) => {
    await expect(processor.execute(job(value) as never)).rejects.toThrow(/CHAT_/u);
  });

  it('rejects an empty AI response', async () => {
    ai.generate.mockResolvedValue({
      content: ' ',
      model: 'deepseek',
      promptTokens: 1,
      completionTokens: 0,
      totalTokens: 1,
    });
    await expect(processor.execute(job() as never)).rejects.toThrow('AI_EMPTY_CHAT_RESPONSE');
  });

  it('does not log prompt content', async () => {
    await processor.execute(job() as never);
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('Why JWT?');
  });
});
