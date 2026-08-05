import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';

@Injectable()
export class WorkerDatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(WorkerLoggerService) private readonly logger: WorkerLoggerService,
  ) {
    super({
      adapter: new PrismaPg({ connectionString: config.getOrThrow<string>('worker.databaseUrl') }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected', 'WorkerDatabaseService');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database disconnected', 'WorkerDatabaseService');
  }

  async healthCheck(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
