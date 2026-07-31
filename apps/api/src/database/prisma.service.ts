import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const defaultDatabaseUrl =
  'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const connectionString = process.env.DATABASE_URL ?? defaultDatabaseUrl;
    const adapter = new PrismaPg({ connectionString });

    super({ adapter });

    // Ensures validated Nest config has database.url available as designed.
    configService.getOrThrow<string>('database.url');
  }

  async onModuleInit(): Promise<void> {
    // Prepared for real DB connection. We do not force connect in skeleton mode,
    // so /api/health works before docker-compose infrastructure exists.
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
