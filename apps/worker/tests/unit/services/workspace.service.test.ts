import { describe, expect, it, vi } from 'vitest';
import { WorkspaceService } from '../../../src/services/workspace.service';

describe('WorkspaceService', () => {
  it('delegates workspace creation', async () => {
    const filesystem = {
      createWorkspace: vi.fn().mockResolvedValue({ root: '/tmp/x' }),
      jobDirectory: vi.fn(),
      removeWorkspace: vi.fn(),
    };
    await expect(new WorkspaceService(filesystem as never).create('j1')).resolves.toEqual({
      root: '/tmp/x',
    });
    expect(filesystem.createWorkspace).toHaveBeenCalledWith('j1');
  });
  it('delegates cleanup and path resolution', async () => {
    const filesystem = {
      createWorkspace: vi.fn(),
      jobDirectory: vi.fn().mockReturnValue('/tmp/j1'),
      removeWorkspace: vi.fn().mockResolvedValue(undefined),
    };
    const service = new WorkspaceService(filesystem as never);
    expect(service.path('j1')).toBe('/tmp/j1');
    await service.cleanup('j1');
    expect(filesystem.removeWorkspace).toHaveBeenCalledWith('j1');
  });
});
