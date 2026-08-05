import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArchiveService } from '../../../src/services/archive.service';

describe('ArchiveService', () => {
  it('rejects a corrupt archive', async () => {
    const root = await mkdtemp(join(tmpdir(), 'reviewsha-archive-'));
    const archive = join(root, 'bad.zip');
    await writeFile(archive, 'not a zip');
    await expect(new ArchiveService().extract(archive, join(root, 'out'))).rejects.toThrow();
    await rm(root, { recursive: true, force: true });
  });

  it('reports an existing readable archive path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'reviewsha-archive-'));
    const archive = join(root, 'file.zip');
    await writeFile(archive, 'x');
    const service = new ArchiveService();
    expect(await service.isReadable(archive)).toBe(true);
    expect(await service.isReadable(join(root, 'missing.zip'))).toBe(false);
    await rm(root, { recursive: true, force: true });
  });
});
