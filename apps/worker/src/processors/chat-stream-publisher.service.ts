import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const eventsChannel = (streamId: string) => `reviewsha:chat:stream:${streamId}`;

@Injectable()
export class ChatStreamPublisherService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('worker.redisUrl'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => undefined);
  }

  async publish(streamId: string, event: unknown): Promise<void> {
    if (this.redis.status === 'wait') await this.redis.connect();
    await this.redis.publish(eventsChannel(streamId), JSON.stringify(event));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== 'end') await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
