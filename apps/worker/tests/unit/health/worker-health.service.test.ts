import { describe, expect, it, vi } from 'vitest';
import { WorkerHealthService } from '../../../src/health/worker-health.service';

function setup() {
  const queue = { healthCheck: vi.fn(async () => ({ redis: 'ok', queues: {} })) };
  const database = { healthCheck: vi.fn(async () => undefined) };
  const storage = { healthCheck: vi.fn(async () => undefined) };
  return {
    service: new WorkerHealthService(queue as never, database as never, storage as never),
    queue,
    database,
    storage,
  };
}

describe('WorkerHealthService', () => {
  it('checks Redis, database and storage', async () => {
    const x = setup();
    await expect(x.service.check()).resolves.toEqual({
      status: 'ok',
      redis: 'ok',
      database: 'ok',
      storage: 'ok',
    });
    expect(x.queue.healthCheck).toHaveBeenCalledOnce();
    expect(x.database.healthCheck).toHaveBeenCalledOnce();
    expect(x.storage.healthCheck).toHaveBeenCalledOnce();
  });

  it('propagates Redis failures', async () => {
    const x = setup();
    x.queue.healthCheck.mockRejectedValue(new Error('redis down'));
    await expect(x.service.check()).rejects.toThrow('redis down');
  });

  it('propagates database failures', async () => {
    const x = setup();
    x.database.healthCheck.mockRejectedValue(new Error('database down'));
    await expect(x.service.check()).rejects.toThrow('database down');
  });

  it('propagates storage failures', async () => {
    const x = setup();
    x.storage.healthCheck.mockRejectedValue(new Error('storage down'));
    await expect(x.service.check()).rejects.toThrow('storage down');
  });
});
