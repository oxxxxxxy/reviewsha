import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const controlChannel = (streamId: string) => `reviewsha:chat:control:${streamId}`;

@Injectable()
export class ChatStreamControlService {
  constructor(private readonly config: ConfigService) {}

  async listen(streamId: string, controller: AbortController): Promise<() => Promise<void>> {
    const subscriber = new Redis(this.config.getOrThrow<string>('worker.redisUrl'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    await subscriber.connect();
    const channel = controlChannel(streamId);
    const onMessage = () => controller.abort();
    subscriber.on('message', onMessage);
    await subscriber.subscribe(channel);
    return async () => {
      subscriber.off('message', onMessage);
      await subscriber.unsubscribe(channel).catch(() => undefined);
      await subscriber.quit().catch(() => subscriber.disconnect());
    };
  }
}
