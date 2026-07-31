import { describe, expect, it } from 'vitest';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok status', () => {
    expect(new HealthService().getHealth()).toEqual({ status: 'ok' });
  });
});
