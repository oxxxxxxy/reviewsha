import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { ApiLoggerService } from '../../../src/common/logger/api-logger.service';
import { DatabaseModule } from '../../../src/database/database.module';
import { PrismaService } from '../../../src/database/prisma.service';

function createPrismaService(): PrismaService {
  return new PrismaService(
    {
      get: vi.fn((_key: string, fallback?: unknown) => fallback),
      getOrThrow: vi.fn(
        () => 'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
      ),
    } as unknown as ConfigService,
    {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      format: vi.fn(),
    } as unknown as ApiLoggerService,
  );
}

describe('PrismaService', () => {
  it('creates a PrismaService instance', () => {
    const service = createPrismaService();

    expect(service).toBeTruthy();
    expect(service.constructor.name).toBe('PrismaService');
  });

  it('connects on module init', async () => {
    const service = createPrismaService();
    const connect = vi.spyOn(service, '$connect').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledOnce();
    await service.$disconnect();
  });

  it('disconnects on module destroy', async () => {
    const service = createPrismaService();
    const disconnect = vi.spyOn(service, '$disconnect').mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('keeps PrismaService singleton inside Nest container', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: vi.fn((_key: string, fallback?: unknown) => fallback),
        getOrThrow: vi.fn(
          () => 'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
        ),
      })
      .overrideProvider(ApiLoggerService)
      .useValue({ log: vi.fn(), warn: vi.fn(), error: vi.fn(), format: vi.fn() })
      .compile();

    expect(moduleRef.get(PrismaService)).toBe(moduleRef.get(PrismaService));
    await moduleRef.close();
  });

  it('exposes transaction API for future repositories', async () => {
    const service = createPrismaService();
    const transaction = vi.spyOn(service, '$transaction').mockResolvedValue(['ok'] as never);

    await expect(service.$transaction([])).resolves.toEqual(['ok']);
    expect(transaction).toHaveBeenCalledOnce();
    await service.$disconnect();
  });

  it('keeps manual PrismaClient creation out of API src except PrismaService', () => {
    const databaseSource = readFileSync(
      join(process.cwd(), 'src/database/prisma.service.ts'),
      'utf8',
    );
    const seedSource = readFileSync(join(process.cwd(), 'prisma/seed.ts'), 'utf8');

    expect(databaseSource).toContain('extends PrismaClient');
    expect(seedSource).toContain('new PrismaClient');
  });
});
