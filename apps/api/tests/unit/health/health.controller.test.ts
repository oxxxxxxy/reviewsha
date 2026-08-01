import { describe, expect, it, vi } from 'vitest';

import { HealthController } from '../../../src/health/health.controller';
import { HealthService } from '../../../src/health/health.service';

describe('HealthController', () => {
  it('delegates health response to HealthService', async () => {
    const service = {
      getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    } as unknown as HealthService;
    const controller = new HealthController(service);

    await expect(controller.getHealth()).resolves.toEqual({ status: 'ok' });
    expect(service.getHealth).toHaveBeenCalledOnce();
  });
});
