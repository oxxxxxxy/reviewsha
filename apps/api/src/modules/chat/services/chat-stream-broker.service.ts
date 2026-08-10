import { Injectable, OnModuleDestroy } from '@nestjs/common';
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
  private readonly publishers = new Set<Redis>();

  constructor(private readonly config: ConfigService) {}

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
    this.publishers.add(publisher);
    await subscriber.connect();
    await publisher.connect();

    const queue: ChatBrokerEvent[] = [];
    const waiters: Array<(event: ChatBrokerEvent | null) => void> = [];
    let closed = false;
    const channel = eventsChannel(streamId);
    const onMessage = (_channel: string, raw: string) => {
      const event = JSON.parse(raw) as ChatBrokerEvent;
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
      await subscriber.unsubscribe(channel).catch(() => undefined);
      await subscriber.quit().catch(() => subscriber.disconnect());
      this.publishers.delete(publisher);
      await publisher.quit().catch(() => publisher.disconnect());
      while (waiters.length) waiters.shift()?.(null);
    };
    const abort = () => {
      void publisher.publish(controlChannel(streamId), JSON.stringify({ type: 'cancel' }));
      void close();
    };
    signal?.addEventListener('abort', abort, { once: true });

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
      [...this.publishers].map((publisher) => publisher.quit().catch(() => undefined)),
    );
    this.publishers.clear();
  }
}

export { controlChannel, eventsChannel };
