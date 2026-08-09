import { Role } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ChatStreamingService } from '../../../../src/modules/chat/services/chat-streaming.service';

const user = { id: 'u1', email: 'u@example.com', role: Role.USER };

describe('ChatStreamingService', () => {
  it('streams tokens and completion metadata', async () => {
    const chat = { send: vi.fn(async () => ({ id: 'm1', content: 'Hello world', tokens: 2 })) };
    const events = [];
    for await (const event of new ChatStreamingService(chat as never).stream(user, 's1', {
      message: 'Hi',
    }))
      events.push(event);
    expect(events).toEqual([
      { event: 'token', data: { token: 'Hello ' } },
      { event: 'token', data: { token: 'world' } },
      { event: 'complete', data: { messageId: 'm1', tokens: 2 } },
    ]);
  });

  it.each(['one', 'one two', 'one\ntwo', ' one  two '])(
    'reassembles response %j',
    async (content) => {
      const chat = { send: vi.fn(async () => ({ id: 'm1', content, tokens: 2 })) };
      const tokens: string[] = [];
      for await (const event of new ChatStreamingService(chat as never).stream(user, 's1', {
        message: 'Hi',
      })) {
        if (event.event === 'token') tokens.push(event.data.token);
      }
      expect(tokens.join('')).toBe(content.trimStart());
    },
  );

  it('stops after cancellation', async () => {
    const chat = { send: vi.fn(async () => ({ id: 'm1', content: 'one two', tokens: 2 })) };
    const abort = new AbortController();
    abort.abort();
    const events = [];
    for await (const event of new ChatStreamingService(chat as never).stream(
      user,
      's1',
      { message: 'Hi' },
      abort.signal,
    ))
      events.push(event);
    expect(events).toEqual([]);
  });

  it('propagates AI errors', async () => {
    const chat = { send: vi.fn(async () => Promise.reject(new Error('AI failed'))) };
    const stream = new ChatStreamingService(chat as never).stream(user, 's1', { message: 'Hi' });
    await expect(stream.next()).rejects.toThrow('AI failed');
  });
});
