import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { ChatContextSnapshot } from '../interfaces/chat.interfaces';

@Injectable()
export class ChatContextCacheService implements OnModuleDestroy {
  private readonly memory = new Map<string, ChatContextSnapshot>();
  private readonly redis: Redis;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('redis.url'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => undefined);
  }

  async get(key: string): Promise<ChatContextSnapshot | null> {
    try {
      await this.connect();
      const value = await this.redis.get(this.key(key));
      if (value) return JSON.parse(value) as ChatContextSnapshot;
    } catch {
      // Continue with the in-memory fallback.
    }
    return this.memory.get(key) ?? null;
  }

  async set(key: string, value: ChatContextSnapshot): Promise<void> {
    this.memory.set(key, value);
    try {
      await this.connect();
      await this.redis.set(
        this.key(key),
        JSON.stringify(value),
        'EX',
        this.config.get<number>('chat.contextCacheTtlSeconds', 900),
      );
    } catch {
      // The cache is optional; the prepared snapshot remains in memory.
    }
  }

  async clear(projectId?: string): Promise<void> {
    if (!projectId) this.memory.clear();
    else {
      for (const key of this.memory.keys()) {
        if (key.startsWith(`${projectId}:`)) this.memory.delete(key);
      }
    }
    try {
      await this.connect();
      let cursor = '0';
      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH',
          this.key(projectId ? `${projectId}:*` : '*'),
          'COUNT',
          100,
        );
        cursor = result[0];
        if (result[1].length) await this.redis.del(...result[1]);
      } while (cursor !== '0');
    } catch {
      // Analysis identity in cache keys prevents stale context from being selected.
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== 'end') await this.redis.quit().catch(() => this.redis.disconnect());
  }

  private async connect(): Promise<void> {
    if (this.redis.status === 'wait') await this.redis.connect();
  }

  private key(value: string): string {
    return `reviewsha:chat:context:${value}`;
  }
}
