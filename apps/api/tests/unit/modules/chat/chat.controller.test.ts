import { EventEmitter } from 'node:events';
import { Role } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ChatController } from '../../../../src/modules/chat/controllers/chat.controller';

const user = { id: 'user-1', email: 'user@example.com', role: Role.USER };

class FakeResponse extends EventEmitter {
  status = vi.fn(() => this);
  setHeader = vi.fn();
  flushHeaders = vi.fn();
  write = vi.fn();
  end = vi.fn();
}

describe('ChatController streaming lifecycle', () => {
  it('aborts the upstream stream when the client connection closes', async () => {
    let signal: AbortSignal | undefined;
    let release!: () => void;
    const streaming = {
      stream: vi.fn(async function* (
        _user: typeof user,
        _sessionId: string,
        _dto: unknown,
        abort: AbortSignal,
      ) {
        signal = abort;
        yield { event: 'token', data: { token: 'partial' } };
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }),
    };
    const controller = new ChatController({} as never, {} as never, streaming as never);
    const response = new FakeResponse();
    const pending = controller.stream(user, 'session-1', { message: 'hello' }, response as never);

    await vi.waitFor(() => {
      expect(signal).toBeDefined();
      expect(release).toBeTypeOf('function');
    });
    response.emit('close');
    expect(signal?.aborted).toBe(true);
    release();
    await pending;
    expect(response.end).toHaveBeenCalledOnce();
  });
});
