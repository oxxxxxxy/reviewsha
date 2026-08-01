import { describe, expect, it } from 'vitest';

import { WorkerModule } from '../../src/worker.module';

describe('WorkerModule', () => {
  it('is defined for Nest application context bootstrap', () => {
    expect(WorkerModule).toBeDefined();
  });
});
