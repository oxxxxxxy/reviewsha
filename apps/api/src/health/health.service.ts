import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { QueueService } from '../modules/queue/queue.service';
import { StorageService } from '../modules/storage/services/storage.service';

export interface HealthResponse {
  status: 'ok';
  database?: 'ok';
  redis?: 'ok';
  storage?: 'ok';
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() private readonly queue?: QueueService,
    @Optional() private readonly storage?: StorageService,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    try {
      await this.prisma.healthCheck();
      if (!this.queue || !this.storage) return { status: 'ok' };
      await this.queue.healthCheck();
      await this.storage.healthCheck();
      return { status: 'ok', database: 'ok', redis: 'ok', storage: 'ok' };
    } catch (error) {
      throw new ServiceUnavailableException('Database connection is unavailable', {
        cause: error,
      });
    }
  }
}
