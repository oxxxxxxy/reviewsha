import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type ChatBrokerEvent =
  | { type: 'token'; token: string }
  | { type: 'complete'; messageId: string; tokens: number }
  | { type: 'error'; message: string };

export type ChatStreamSubscription = AsyncIterable<ChatBrokerEvent> & {
  cancel(): Promise<void>;
};

const eventsChannel = (streamId: string) => `reviewsha:chat:stream:${streamId}`;
const controlChannel = (streamId: string) => `reviewsha:chat:control:${streamId}`;

@Injectable()
export class ChatStreamBrokerService implements OnModuleDestroy {
  private readonly config: ConfigService;
  private readonly subscribers = new Set<Redis>();
  private readonly publishers = new Set<Redis>();

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.config = config;
  }

  async open(streamId: string, signal?: AbortSignal): Promise<ChatStreamSubscription> {
    const subscriber = new Redis(this.config.getOrThrow<string>('redis.url'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    const publisher = new Redis(this.config.getOrThrow<string>('redis.url'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    // ioredis emits connection errors asynchronously. Without listeners an
    // SSE disconnect can terminate the whole Nest process and the frontend
    // then incorrectly appears logged out because every request becomes a
    // CORS/network failure.
    subscriber.on('error', () => undefined);
    publisher.on('error', () => undefined);
    this.subscribers.add(subscriber);
    this.publishers.add(publisher);
    await subscriber.connect();
    await publisher.connect();

    const queue: ChatBrokerEvent[] = [];
    const waiters: Array<(event: ChatBrokerEvent | null) => void> = [];
    let closed = false;
    const channel = eventsChannel(streamId);
    const onMessage = (_channel: string, raw: string) => {
      let event: ChatBrokerEvent;
      try {
        event = JSON.parse(raw) as ChatBrokerEvent;
      } catch {
        event = { type: 'error', message: 'Malformed chat stream event' };
      }
      const waiter = waiters.shift();
      if (waiter) waiter(event);
      else queue.push(event);
    };
    subscriber.on('message', onMessage);
    await subscriber.subscribe(channel);

    const close = async () => {
      if (closed) return;
      closed = true;
      subscriber.off('message', onMessage);
      this.subscribers.delete(subscriber);
      await subscriber.unsubscribe(channel).catch(() => undefined);
      await subscriber.quit().catch(() => subscriber.disconnect());
      this.publishers.delete(publisher);
      await publisher.quit().catch(() => publisher.disconnect());
      while (waiters.length) waiters.shift()?.(null);
    };
    const abort = () => {
      // Do not close the publisher while publish() is still pending. That
      // race produces ioredis "Connection is closed" rejections and used to
      // terminate the API during a cancelled/unfinished chat request.
      void (async () => {
        try {
          if (publisher.status !== 'end') {
            await publisher.publish(controlChannel(streamId), JSON.stringify({ type: 'cancel' }));
          }
        } catch {
          // Cancellation is best effort.
        } finally {
          await close();
        }
      })();
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();

    const subscription: ChatStreamSubscription = {
      cancel: close,
      [Symbol.asyncIterator]: async function* () {
        try {
          while (!closed) {
            const event =
              queue.shift() ??
              (await new Promise<ChatBrokerEvent | null>((resolve) => waiters.push(resolve)));
            if (!event) return;
            yield event;
            if (event.type === 'complete' || event.type === 'error') return;
          }
        } finally {
          signal?.removeEventListener('abort', abort);
          await close();
        }
      },
    };
    return subscription;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.publishers, ...this.subscribers].map((client) =>
        client.quit().catch(() => undefined),
      ),
    );
    this.publishers.clear();
    this.subscribers.clear();
  }
}

export { controlChannel, eventsChannel };
