import { Role } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ChatStreamingService } from '../../../../src/modules/chat/services/chat-streaming.service';

const user = { id: 'u1', email: 'u@example.com', role: Role.USER };

function setup(events: unknown[] = []) {
  const chat = {
    startStream: vi.fn(async () => ({ requestId: 'job-1' })),
    finishStream: vi.fn(async () => undefined),
  };
  const subscription = {
    cancel: vi.fn(async () => undefined),
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
    },
  };
  const broker = { open: vi.fn(async () => subscription) };
  return { service: new ChatStreamingService(chat as never, broker as never), chat, broker };
}

describe('ChatStreamingService', () => {
  it('forwards provider chunks and completion metadata', async () => {
    const { service } = setup([
      { type: 'token', token: 'Hello ' },
      { type: 'token', token: 'world' },
      { type: 'complete', messageId: 'm1', tokens: 2 },
    ]);
    const events = [];
    for await (const event of service.stream(user, 's1', { message: 'Hi' })) events.push(event);
    expect(events).toEqual([
      { event: 'token', data: { token: 'Hello ' } },
      { event: 'token', data: { token: 'world' } },
      { event: 'complete', data: { messageId: 'm1', tokens: 2 } },
    ]);
  });

  it('preserves whitespace and does not reconstruct a completed response', async () => {
    const { service } = setup([
      { type: 'token', token: 'one' },
      { type: 'token', token: '\n two ' },
      { type: 'complete', messageId: 'm1', tokens: 2 },
    ]);
    const tokens: string[] = [];
    for await (const event of service.stream(user, 's1', { message: 'Hi' })) {
      if (event.event === 'token') tokens.push(event.data.token);
    }
    expect(tokens.join('')).toBe('one\n two ');
  });

  it('does not emit chunks after cancellation', async () => {
    const abort = new AbortController();
    abort.abort();
    const { service } = setup([]);
    const events = [];
    for await (const event of service.stream(user, 's1', { message: 'Hi' }, abort.signal)) {
      events.push(event);
    }
    expect(events).toEqual([]);
  });

  it('propagates broker errors', async () => {
    const { service } = setup([{ type: 'error', message: 'AI failed' }]);
    const stream = service.stream(user, 's1', { message: 'Hi' });
    await expect(stream.next()).rejects.toThrow('AI failed');
  });
});
