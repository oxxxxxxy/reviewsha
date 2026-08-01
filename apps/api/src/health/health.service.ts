import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

export interface HealthResponse {
  status: 'ok';
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    try {
      await this.prisma.healthCheck();
      return { status: 'ok' };
    } catch (error) {
      throw new ServiceUnavailableException('Database connection is unavailable', {
        cause: error,
      });
    }
  }
}
