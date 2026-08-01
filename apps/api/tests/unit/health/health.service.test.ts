import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../../src/database/prisma.service';
import { HealthService } from '../../../src/health/health.service';

describe('HealthService', () => {
  it('returns ok status after database health check', async () => {
    const prisma = {
      healthCheck: vi.fn().mockResolvedValue(undefined),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.getHealth()).resolves.toEqual({ status: 'ok' });
    expect(prisma.healthCheck).toHaveBeenCalledOnce();
  });

  it('throws service unavailable when database check fails', async () => {
    const prisma = {
      healthCheck: vi.fn().mockRejectedValue(new Error('offline')),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.getHealth()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
