import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('database.url');
    const adapter = new PrismaPg({ connectionString });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    // Prepared for real DB connection. We do not force connect in skeleton mode,
    // so /api/v1/health works before docker-compose infrastructure exists.
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
