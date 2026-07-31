import { describe, expect, it, vi } from 'vitest';

import { ShutdownService } from './shutdown.service';

describe('ShutdownService', () => {
  it('binds SIGINT and SIGTERM handlers', () => {
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const service = new ShutdownService(logger as never);
    const app = { close: vi.fn().mockResolvedValue(undefined) };
    const onceSpy = vi.spyOn(process, 'once').mockImplementation(() => process);

    service.bind(app as never);

    expect(onceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(onceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

    onceSpy.mockRestore();
  });
});
