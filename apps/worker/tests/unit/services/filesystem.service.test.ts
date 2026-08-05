import { describe, expect, it } from 'vitest';
import { access } from 'node:fs/promises';
import { FilesystemService } from '../../../src/services/filesystem.service';

describe('FilesystemService', () => {
  it('creates isolated job workspace directories', async () => {
    const service = new FilesystemService();
    const workspace = await service.createWorkspace(`test-${Date.now()}`);
    await expect(access(workspace.source)).resolves.toBeUndefined();
    await expect(access(workspace.extracted)).resolves.toBeUndefined();
    await expect(access(workspace.output)).resolves.toBeUndefined();
    await service.removeWorkspace(workspace.root.split('/').pop()!);
  });

  it('uses job id as workspace boundary', () => {
    const service = new FilesystemService();
    expect(service.jobDirectory('job-a')).not.toBe(service.jobDirectory('job-b'));
  });

  it('returns the expected workspace layout', async () => {
    const service = new FilesystemService();
    const workspace = await service.createWorkspace(`test-${Date.now()}`);
    expect(workspace.source.endsWith('/source')).toBe(true);
    expect(workspace.extracted.endsWith('/extracted')).toBe(true);
    expect(workspace.output.endsWith('/output')).toBe(true);
    await service.removeWorkspace(workspace.root.split('/').pop()!);
  });

  it('cleanup is idempotent', async () => {
    await expect(
      new FilesystemService().removeWorkspace(`missing-${Date.now()}`),
    ).resolves.toBeUndefined();
  });
});
