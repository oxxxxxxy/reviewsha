import { describe, expect, it } from 'vitest';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('delegates health response to HealthService', () => {
    const service = new HealthService();
    const controller = new HealthController(service);

    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
