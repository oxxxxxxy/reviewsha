import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '@prisma/client';

import { ApiLoggerService } from '../common/logger/api-logger.service';
import { AdminLogSink } from './admin-log-sink';

function createPrismaLogConfig(configService: ConfigService): Prisma.LogDefinition[] {
  const shouldLogQueries = configService.get<boolean>('database.logQueries', false);
  const baseLogConfig: Prisma.LogDefinition[] = [
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'info' },
  ];

  if (shouldLogQueries) {
    baseLogConfig.push({ emit: 'stdout', level: 'query' });
  }

  return baseLogConfig;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(ApiLoggerService) private readonly logger: ApiLoggerService,
    @Optional() @Inject(AdminLogSink) private readonly logSink?: AdminLogSink,
  ) {
    const connectionString = configService.getOrThrow<string>('database.url');
    const adapter = new PrismaPg({ connectionString });

    super({
      adapter,
      log: createPrismaLogConfig(configService),
    });
  }

  async onModuleInit(): Promise<void> {
    this.logSink?.setWriter((entry) => this.persistAdminLog(entry));
    await this.$connect();
    this.logger.log('Prisma connected', 'PrismaService');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logSink?.clearWriter();
    this.logger.log('Prisma disconnected', 'PrismaService');
  }

  async healthCheck(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }

  async persistAdminLog(entry: {
    level: string;
    service: string;
    context: string;
    message: string;
    stack?: string;
  }): Promise<void> {
    await this.adminLog.create({ data: entry });
  }
}
